# LLM Token Count

**Real LLM token counts for GLM, GPT, Qwen & DeepSeek in Obsidian's status bar — so you know if a note fits the context budget before you send it.**

![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7C3AED.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg) ![Desktop only](https://img.shields.io/badge/Platform-Desktop%20only-6E7681.svg)

![Status bar showing the token count next to Obsidian's default word/character count](https://raw.githubusercontent.com/hardes11/obsidian-llm-token-count/main/assets/status-bar.png)

The token count (`10,485 tokens · glm-5.2 (exact)`) appears in the status bar alongside Obsidian's built-in word and character counts — live, for whatever note you have open.

## What it does

- **See token counts before you send.** The status bar shows the active note's token count under your chosen model's tokenizer, so you can tell at a glance whether it fits the context window or needs chunking/summarizing.
- **Accurate for GLM-5.2 — not a GPT approximation.** The only Obsidian token-count plugin that tokenizes GLM-5.2 with its real HuggingFace tokenizer. GPT-based counters over-count Chinese by 10–30% and mislead your context-budget decisions if you actually run GLM.
- **11 models, honestly labeled.** GLM-5.2/5/4.6v-flash, GPT-5/4o/4/3.5, Qwen, DeepSeek-V3.1 are **exact**; Claude and Gemini are **approx** (`o200k_base × 1.15`, clearly labeled — never silently passed off as exact).
- **Offline after first use.** The tokenizer is fetched once from HuggingFace (pinned to a specific commit for reproducibility) and cached locally. Subsequent counts are instant and need no network. GPT/Claude/Gemini need no fetch at all.

## Installation

Manual install (community-registry PR pending):

1. Download [`main.js`](https://raw.githubusercontent.com/hardes11/obsidian-llm-token-count/main/main.js), [`manifest.json`](https://raw.githubusercontent.com/hardes11/obsidian-llm-token-count/main/manifest.json), and [`styles.css`](https://raw.githubusercontent.com/hardes11/obsidian-llm-token-count/main/styles.css).
2. Place them in your vault at `.obsidian/plugins/obsidian-llm-token-count/`.
3. In Obsidian: **Settings → Community plugins**, reload the plugin list, enable **LLM Token Count**.

On first use with a HuggingFace-sourced model (GLM, Qwen, DeepSeek), the plugin fetches the tokenizer and caches it under `.obsidian/plugins/obsidian-llm-token-count/tokenizers/`. The first count takes a few seconds; every count after is instant.

## Configuration

Open **Settings → LLM Token Count**:

- **Default model** — dropdown of all 11 supported models. Changing it re-counts the active note immediately.
- **Re-download tokenizer** — clears the cached tokenizer for the current model so the next count re-fetches from HuggingFace. Use after a tokenizer version bump or if the cache becomes corrupt.

There is no auto-sync: the model is a manual choice. (The companion `obsidian-opencode-mcp-plugin` adds an auto-sync variant for agents — see Related.)

## Compatibility

- **Obsidian 1.4.0+**, desktop only (`isDesktopOnly: true`). The plugin uses Node's `fs` and `fetch` for the tokenizer cache, which aren't available on mobile.
- **Coexists with other token-count plugins** (TokenBar, Token Count, TikToken Tokenizer, LLM Token Counter). This plugin's differentiator is GLM support and multi-model exact counting via HuggingFace tokenizers.
- **No data leaves your machine** except the one-time HuggingFace tokenizer fetch. Notes are never sent anywhere — tokenization is fully local.

## Why

Obsidian's status bar shows word and character counts but not LLM tokens — and tokens are what matter for context-budget decisions. The four existing community token-count plugins all use `js-tiktoken` (GPT encodings). None support GLM-5.2, which uses Zhipu's own BPE tokenizer (~154,856 vocab, byte-level). A GPT token count is a poor proxy: `o200k_base` over-counts pure Chinese by ~15–30% vs real GLM tokens, which is bad enough to break "does this fit in context?" judgments for both CJK-heavy and mixed-language notes. If you run GLM (via Zhipu or Ollama), you need a GLM tokenizer — this is it.

## How it works

For exact models, the plugin fetches the model's `tokenizer.json` from HuggingFace (pinned to a specific commit SHA for reproducibility), caches it on disk, and encodes via `@huggingface/tokenizers` (pure JS). GPT models use `js-tiktoken`. Claude and Gemini have no published offline tokenizer, so they use `o200k_base × 1.15` and are labeled `(approx)` — never presented as exact. The status bar updates on note switch and (debounced, 300 ms) on content change; files over 100 KB count only on switch to avoid re-encoding on every keystroke.

## Supported models

| Model | Source | Mode |
|---|---|---|
| `glm-5.2` | HuggingFace `zai-org/GLM-5.2` @ `b4734de…` | exact |
| `glm-5` | HuggingFace `zai-org/GLM-5` @ `4e6698b…` | exact |
| `glm-4.6v-flash` | HuggingFace `zai-org/GLM-4.6V-Flash` @ `411bb4d…` | exact |
| `qwen` | HuggingFace `Qwen/Qwen3-8B` @ `b968826…` | exact |
| `deepseek-v3.1` | HuggingFace `deepseek-ai/DeepSeek-V3.1` @ `c0781d0…` | exact |
| `gpt-5`, `gpt-4o` | `js-tiktoken` `o200k_base` | exact |
| `gpt-4`, `gpt-3.5` | `js-tiktoken` `cl100k_base` | exact |
| `claude`, `gemini` | `o200k_base × 1.15` | approx |

Pinned SHAs live in [`src/registry.ts`](src/registry.ts) of the core package. A tokenizer version bump is a registry edit + a new release.

## Status-bar format

```
<count> tokens · <model> (<exact|approx>)
```

Variants: `loading · <model>…` (model switch mid-load), `… tokens · <model> (<source>) [large file]` (>100 KB, until first count lands), `offline — approx · <model> (approx)` (HF fetch failed on first use), `—` (active file isn't Markdown).

## Implementation notes

- Tokenization core: [`@hardes11/tokenizers-core`](https://github.com/hardes11/tokenizers-core) — framework-agnostic, npm-published, usable outside Obsidian.
- Build: esbuild bundles the core + `@huggingface/tokenizers` + `js-tiktoken` into a single `main.js` (~5.5 MB; the 20 MB GLM `tokenizer.json` is fetched at runtime, not bundled).
- `manifest.json`: `id: obsidian-llm-token-count`, `isDesktopOnly: true`, `minAppVersion: 1.4.0`.

```bash
npm install
npm run build   # → main.js
```

## Related

- [`@hardes11/tokenizers-core`](https://github.com/hardes11/tokenizers-core) — the framework-agnostic tokenization engine this plugin uses. Usable from any Node script or bundler.
- [`hardes11/obsidian-opencode-mcp-plugin`](https://github.com/hardes11/obsidian-opencode-mcp-plugin) — adds a `vault_count_tokens` MCP tool so AI agents can self-check a note's token count before sending it to a model. Includes auto-sync from the active model and suppresses its own status-bar item when this standalone is installed.

## License

MIT