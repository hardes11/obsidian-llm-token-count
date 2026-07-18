# LLM Token Count

Accurate LLM token counts in the Obsidian status bar. Counts the active Markdown note's text using real HuggingFace tokenizers (GLM, Qwen, DeepSeek) or tiktoken (GPT), with an approximation fallback for Claude and Gemini.

## What it does

Adds a status-bar item showing the token count of the currently active Markdown note, e.g.:

```
1,284 tokens · glm-5.2 (exact)
```

The count updates on leaf change and (debounced, 300 ms) on content change. The label is `exact` for real-tokenizer counts and `approx` for Claude/Gemini (which use `ceil(o200k_base_count * 1.15)`).

## Supported models

| Model | Source | Mode |
|---|---|---|
| `glm-5.2` | HuggingFace `zai-org/GLM-5.2` @ `b4734de…` | exact |
| `glm-5` | HuggingFace `zai-org/GLM-5` @ `4e6698b…` | exact |
| `glm-4.6v-flash` | HuggingFace `zai-org/GLM-4.6V-Flash` @ `411bb4d…` | exact |
| `qwen` | HuggingFace `Qwen/Qwen3-8B` @ `b968826…` | exact |
| `deepseek-v3.1` | HuggingFace `deepseek-ai/DeepSeek-V3.1` @ `c0781d0…` | exact |
| `gpt-5` | tiktoken `o200k_base` | exact |
| `gpt-4o` | tiktoken `o200k_base` | exact |
| `gpt-4` | tiktoken `cl100k_base` | exact |
| `gpt-3.5` | tiktoken `cl100k_base` | exact |
| `claude` | `o200k_base * 1.15` | approx |
| `gemini` | `o200k_base * 1.15` | approx |

Exactness for the GLM family comes from the pinned HuggingFace commit SHA — the tokenizer.json is fetched once and cached, so counts are deterministic across machines and over time.

## Install

Manual install (until a community-registry PR merges):

1. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/obsidian-llm-token-count/`.
2. In Obsidian: Settings → Community plugins, reload the plugin list, enable "LLM Token Count".

On first use with an HF-source model (GLM, Qwen, DeepSeek), the plugin fetches the tokenizer from HuggingFace and caches it under `.obsidian/plugins/obsidian-llm-token-count/tokenizers/`. Subsequent counts use the cache (no network). tiktoken and approx models need no fetch.

## Settings

- **Default model** — dropdown of all 11 supported models. Changing it re-counts the active note immediately.
- **Re-download tokenizer** — deletes the cached tokenizer files for the current model so the next count re-fetches from HuggingFace. Use after a tokenizer version bump or if the cache is corrupt.

## Status-bar format

```
<tokens> tokens · <model> (<label>)
```

- `<label>` is `exact` or `approx`.
- For files larger than 100 KB, a `[large file]` suffix is shown and the count may lag slightly behind edits (the count still runs; it just isn't re-triggered on every keystroke).
- When the active leaf is not a Markdown file, the status bar shows `—`.

## Offline fallback

If a count fails (typically because the HF fetch is unreachable on first use of an HF-source model), the status bar shows:

```
offline — approx · <model> (approx)
```

tiktoken and approx models always count offline (no network needed). Only first-use of an HF-source model requires network; once cached, HF models are also fully offline.

## Desktop only

`isDesktopOnly: true`. The plugin uses Node's `fs` and `fetch` for the tokenizer cache, which is not available in Obsidian mobile.

## Source

Core tokenization logic: `@hardes11/tokenizers-core` (local `file:` dependency during development). The plugin bundles the core, `@huggingface/tokenizers`, and `js-tiktoken` into `main.js`. The 20 MB GLM `tokenizer.json` is **not** bundled — it is fetched at runtime to the cache directory.