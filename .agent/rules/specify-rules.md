# english-dictionary Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-11-07

## Active Technologies
- JavaScript (ES2022+), HTML5, Vanilla CSS + Mozilla WebExtensions API (Firefox MV3), `web-ext` (local dev/run), Vitest (unit tests) (002-expand-domain-terms)
- `browser.storage.sync` with automatic fallback to `browser.storage.local` (for user trigger settings and preferences) (002-expand-domain-terms)
- JavaScript (ES2022+), HTML5, Vanilla CSS + Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundling), Vitest (unit tests), web-ext (Firefox dev/lint) (003-add-chrome-support)
- `chrome.storage.sync` / `browser.storage.sync` with automatic fallback to `local` (003-add-chrome-support)
- JavaScript (ES2022+), HTML5, Vanilla CSS + WebExtensions API (Chrome MV3 service worker & Firefox MV3 background script), `web-ext` (Firefox dev runner), Vitest (unit tests) (005-idioms-and-phrases)
- `chrome.storage.sync` / `browser.storage.sync` with fallback to `storage.local` (user trigger settings and preferences) (005-idioms-and-phrases)

- (001-dictionary-word-lookup)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 005-idioms-and-phrases: Added JavaScript (ES2022+), HTML5, Vanilla CSS + WebExtensions API (Chrome MV3 service worker & Firefox MV3 background script), `web-ext` (Firefox dev runner), Vitest (unit tests)
- 003-add-chrome-support: Added JavaScript (ES2022+), HTML5, Vanilla CSS + Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundling), Vitest (unit tests), web-ext (Firefox dev/lint)
- 003-add-chrome-support: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
