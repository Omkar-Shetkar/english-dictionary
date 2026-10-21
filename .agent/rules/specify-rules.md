# english-dictionary Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-10-21

## Active Technologies
- JavaScript (ES2022+), HTML5, Vanilla CSS + Mozilla WebExtensions API (Firefox MV3), `web-ext` (local dev/run), Vitest (unit tests) (002-expand-domain-terms)
- `browser.storage.sync` with automatic fallback to `browser.storage.local` (for user trigger settings and preferences) (002-expand-domain-terms)
- JavaScript (ES2022+), HTML5, Vanilla CSS + Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundling), Vitest (unit tests), web-ext (Firefox dev/lint) (003-add-chrome-support)
- `chrome.storage.sync` / `browser.storage.sync` with automatic fallback to `local` (003-add-chrome-support)

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
- 003-add-chrome-support: Added JavaScript (ES2022+), HTML5, Vanilla CSS + Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundling), Vitest (unit tests), web-ext (Firefox dev/lint)
- 003-add-chrome-support: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 002-expand-domain-terms: Added JavaScript (ES2022+), HTML5, Vanilla CSS + Mozilla WebExtensions API (Firefox MV3), `web-ext` (local dev/run), Vitest (unit tests)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
