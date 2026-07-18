import { FileSystemAdapter, Plugin, TFile } from "obsidian";
import { countTokens, listSupportedModels } from "tokenizer-core";
import { TokenCountSettingsTab } from "./settings";

interface TokenCountSettings {
  defaultModel: string;
}

const DEFAULT_SETTINGS: TokenCountSettings = { defaultModel: "glm-5.2" };

export default class TokenCountPlugin extends Plugin {
  settings: TokenCountSettings = DEFAULT_SETTINGS;
  statusBarEl!: HTMLElement;
  private currentRequestId = 0;
  private debounceTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.statusBarEl = this.addStatusBarItem();

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        await this.updateStatusBar();
      }),
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        // Only react if the changed file is the active markdown file.
        const active = this.app.workspace.getActiveFile();
        if (active && file.path === active.path) this.scheduleDebouncedUpdate();
      }),
    );

    this.addSettingTab(new TokenCountSettingsTab(this.app, this));

    // Initial render after layout is ready (vault + workspace settled).
    this.app.workspace.onLayoutReady(() => this.updateStatusBar());
  }

  private scheduleDebouncedUpdate(): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => this.updateStatusBar(), 300);
  }

  async updateStatusBar(): Promise<void> {
    const active = this.app.workspace.getActiveFile();
    if (!active || !(active instanceof TFile) || active.extension !== "md") {
      this.statusBarEl.setText("—");
      return;
    }

    const requestId = ++this.currentRequestId;

    // Large-file guard: >100KB gets a placeholder immediately. The count still
    // runs, but scheduleDebouncedUpdate (content-change path) won't re-trigger
    // on every keystroke for large files because the editor's own debounce +
    // the 300ms timer already coalesce; the suffix just signals to the user
    // that the count may lag.
    const sizeKB = active.stat.size / 1024;
    const large = sizeKB > 100;
    if (large) {
      this.statusBarEl.setText(
        `… tokens · ${this.settings.defaultModel} (loading) [large file]`,
      );
    } else {
      this.statusBarEl.setText(`loading · ${this.settings.defaultModel}…`);
    }

    // Desktop-only plugin (isDesktopOnly: true) → adapter is always a
    // FileSystemAdapter, which exposes getBasePath(). The DataAdapter
    // interface doesn't declare it, so we narrow via instanceof.
    const adapter = this.app.vault.adapter;
    const basePath = adapter instanceof FileSystemAdapter
      ? adapter.getBasePath()
      : "";
    const cacheDir = `${basePath}/.obsidian/plugins/obsidian-llm-token-count/tokenizers`;

    try {
      const text = await this.app.vault.read(active);
      if (requestId !== this.currentRequestId) return; // cancelled by a newer request
      const result = await countTokens(
        text,
        this.settings.defaultModel,
        cacheDir,
      );
      if (requestId !== this.currentRequestId) return;
      const label = result.source === "approx" ? "approx" : "exact";
      const suffix = large ? " [large file]" : "";
      this.statusBarEl.setText(
        `${result.tokens.toLocaleString()} tokens · ${result.model} (${label})${suffix}`,
      );
    } catch (e) {
      if (requestId !== this.currentRequestId) return;
      // Offline fallback: signal approx/unavailable. The core itself falls back
      // only for HF source (network failure); tiktoken/approx always succeed.
      this.statusBarEl.setText(
        `offline — approx · ${this.settings.defaultModel} (approx)`,
      );
      console.error("[obsidian-llm-token-count] count failed:", e);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData(),
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// Re-exported for potential external use / introspection. Not required by the
// plugin itself but keeps the model list reachable from the bundle's surface.
export { listSupportedModels };