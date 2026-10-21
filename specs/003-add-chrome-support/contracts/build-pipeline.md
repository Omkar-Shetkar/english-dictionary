# Build & Packaging Pipeline Contract

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  

---

## 1. CLI Commands & Scripts

| Command | Purpose | Input Files | Output Directory / Files |
| :--- | :--- | :--- | :--- |
| `npm run build` | Builds both Chrome and Firefox target distributions | `src/**/*` | `dist/chrome/`, `dist/firefox/` |
| `npm run build:chrome` | Builds only the Google Chrome target | `src/**/*`, `src/manifest.chrome.json` | `dist/chrome/` |
| `npm run build:firefox` | Builds only the Mozilla Firefox target | `src/**/*`, `src/manifest.firefox.json` | `dist/firefox/` |
| `npm run package:chrome` | Bundles and creates store-ready Chrome zip | `dist/chrome/` | `web-ext-artifacts/simple-english-dictionary-chrome-<v>.zip` |
| `npm run package:firefox`| Bundles and creates store-ready Firefox zip | `dist/firefox/` | `web-ext-artifacts/simple-english-dictionary-firefox-<v>.zip` |
| `npm run package:all` | Packages both browser distribution archives | `dist/chrome/`, `dist/firefox/` | `web-ext-artifacts/` (.zip for both) |
| `npm run start:chrome` | Builds Chrome target and outputs instructions | `dist/chrome/` | Live development target |
| `npm run start` (or `start:firefox`) | Launches live temporary Firefox profile | `dist/firefox/` | Firefox browser instance |

---

## 2. Directory Layout Requirements for Distribution

### Chrome Distribution (`dist/chrome/`)
Must contain:
- `manifest.json` (Chrome MV3 with `service_worker`)
- `background/background.bundle.js`
- `content/content.bundle.js`
- `options/options.html`, `options/options.bundle.js`, `options/options.css`
- `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`

Must NOT contain:
- Unbundled source files (`.ts`, raw non-bundled `.js`)
- Test files or mocks (`*.test.js`, `tests/`)
- `.git*`, `node_modules/`, `.DS_Store`

### Firefox Distribution (`dist/firefox/`)
Must contain:
- `manifest.json` (Firefox MV3 with `scripts` & `browser_specific_settings.gecko`)
- All compiled assets identical to Chrome layout

---

## 3. Exit Codes & Error Handling
- All commands MUST exit with code `0` on success.
- If esbuild bundling fails, the command MUST exit with non-zero code (`1`) and output bundle syntax errors to stderr.
- If manifest validation fails, the build script MUST abort before generating zip archives.
