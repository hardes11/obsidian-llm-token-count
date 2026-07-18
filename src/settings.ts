import { App, FileSystemAdapter, Notice, PluginSettingTab, Setting } from "obsidian";
import { clearTokenizerCache, listSupportedModels } from "@hardes11/tokenizers-core";
import type TokenCountPlugin from "./main";

export class TokenCountSettingsTab extends PluginSettingTab {
  plugin: TokenCountPlugin;

  constructor(app: App, plugin: TokenCountPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const models = listSupportedModels();

    new Setting(containerEl)
      .setName("Default model")
      .setDesc("Tokenizer used for the status-bar count.")
      .addDropdown((dd) => {
        dd.addOptions(Object.fromEntries(models.map((m) => [m, m])));
        dd.setValue(this.plugin.settings.defaultModel);
        dd.onChange(async (v) => {
          this.plugin.settings.defaultModel = v;
          await this.plugin.saveSettings();
          // Triggers an updateStatusBar; the incrementing requestId inside it
          // cancels any in-flight count under the previous model.
          await this.plugin.updateStatusBar();
        });
      });

    new Setting(containerEl)
      .setName("Re-download tokenizer")
      .setDesc(
        "Clears the cached tokenizer for the current model; re-fetches on next count. Use after a tokenizer version bump.",
      )
      .addButton((btn) => {
        btn.setButtonText("Re-download")
          .setCta()
          .onClick(async () => {
            const model = this.plugin.settings.defaultModel;
            const adapter = this.app.vault.adapter;
            const base = adapter instanceof FileSystemAdapter
              ? adapter.getBasePath()
              : "";
            const dir = `${base}/.obsidian/plugins/obsidian-llm-token-count/tokenizers`;
            try {
              // clearTokenizerCache invalidates BOTH layers: the core's
              // in-memory Tokenizer Map AND the on-disk <model>.json +
              // <model>.config.json files. Without the in-memory drop, the
              // previous manual unlinkSync was a no-op until the plugin was
              // fully reloaded (the in-memory instance won the cache lookup).
              clearTokenizerCache(model, dir);
              new Notice(`Tokenizer cache cleared for ${model}; re-fetching…`);
              // Now the in-memory Map is empty, so updateStatusBar → countTokens
              // → loadTokenizer will re-fetch from HuggingFace.
              await this.plugin.updateStatusBar();
            } catch (e) {
              new Notice(`Re-download failed: ${(e as Error).message}`);
            }
          });
      });
  }
}