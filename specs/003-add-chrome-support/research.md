# Technical Research: Google Chrome Support and Chrome Web Store Deployment

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  
**Spec Reference**: [specs/003-add-chrome-support/spec.md](spec.md)

---

## 1. Dual-Target Build Pipeline Architecture

### Decision
Implement a build script (`scripts/build.js` coordinated via `package.json` scripts) that compiles source files from `src/` into two distinct distribution folders:
- `dist/chrome`: Contains Chrome-compliant Manifest V3 configured with `background.service_worker`, standard action icons, and Chrome-compatible schemas.
- `dist/firefox`: Contains Firefox-compliant Manifest V3 configured with `background.scripts`, `browser_specific_settings.gecko`, and Firefox-specific configurations.

`src/` remains the unified single source of truth for all code logic (`background/`, `content/`, `options/`, `common/`, `icons/`), while browser-specific manifest templates (`src/manifest.chrome.json` and `src/manifest.firefox.json`) supply the respective manifest configurations.

### Rationale
- **Manifest Incompatibilities**:
  - Chrome MV3 requires `"background": { "service_worker": "background/background.bundle.js" }` and outright rejects `"background": { "scripts": [...] }`.
  - Chrome logs schema warnings and may reject submissions containing `browser_specific_settings.gecko`.
  - Mozilla Firefox MV3 requires `browser_specific_settings.gecko` with an extension ID for development signing and AMO submission, and currently relies on `background.scripts` in established ESR and release channels.
- **Developer Safety**: Separate `dist/` directories prevent in-place modification of `src/manifest.json`, preventing dirty git trees during everyday development and testing.

### Alternatives Considered
1. **Single Universal Manifest in `src/`**: Attempting to make one manifest work for both browsers causes Chrome to warn on Gecko settings and fail on background script declarations.
2. **On-the-fly In-Place Manifest Swapping**: Overwriting `src/manifest.json` with temporary files during build is error-prone, risks committing the wrong manifest version to git, and disrupts concurrent testing.

---

## 2. Cross-Browser Runtime Communication & Lifecycle

### Decision
Retain and optimize the vanilla runtime message bridge:
- In Google Chrome, background logic runs inside an ephemeral **Service Worker** that terminates after ~30 seconds of inactivity. To prevent dropped messages or hung connections:
  - Synchronously register `chrome.runtime.onMessage.addListener` at top-level execution scope.
  - Return `true` synchronously from the listener to instruct Chrome to keep the message channel open until `sendResponse` is invoked asynchronously.
- In Firefox, `browser.runtime.onMessage.addListener` handles promises natively and keeps the script persistent or event-driven.
- Storage accesses continue through the `getStorageArea()` helper, which dynamically binds to `chrome.storage.sync` or `browser.storage.sync` (with local fallback).

### Rationale
- The existing codebase (`src/background/background.js`, `src/content/content.js`, `src/common/storage.js`) already incorporates dual-runtime branching (`if (isFirefox) ... else if (typeof chrome !== 'undefined') ...`).
- Eliminates the need for external runtime libraries like `webextension-polyfill`, keeping the bundle lightweight, zero-dependency, and fast to load.

### Alternatives Considered
- **`webextension-polyfill` library**: Adds ~15KB uncompressed runtime wrapper and extra build step. Unnecessary because the extension only utilizes three basic runtime APIs (`runtime.onMessage`, `runtime.sendMessage`, and `storage.sync`).

---

## 3. Packaging & Distribution Artifacts

### Decision
Add dedicated packaging commands in `package.json`:
- `npm run package:chrome`: Builds `dist/chrome` and generates `web-ext-artifacts/simple-english-dictionary-chrome-<version>.zip`.
- `npm run package:firefox`: Builds `dist/firefox` and invokes `web-ext build` or creates `web-ext-artifacts/simple-english-dictionary-firefox-<version>.zip`.
- `npm run package:all`: Produces both packages in a single run.

A Node.js packaging helper (`scripts/package.js`) using Node's built-in `zlib`/`stream` or lightweight archiver generates compliant, clean zip files excluding development files (`.DS_Store`, `tests/`, `node_modules/`).

### Rationale
- Chrome Web Store Developer Dashboard requires a single `.zip` file containing `manifest.json` at its root.
- Dedicated artifacts clearly separate submission packages, preventing developers from uploading a Firefox zip to the Chrome Web Store or vice versa.

### Alternatives Considered
- **Manual OS Zip creation**: Often captures hidden files (`__MACOSX`, `.DS_Store`) that trigger Chrome Web Store linter warnings or rejections.

---

## 4. Chrome Web Store Visual Assets & Specifications

### Decision
Store pre-generated, production-ready store visual assets directly under `assets/store/`:
- `store-icon-128.png`: 128x128px PNG icon used in Chrome Web Store search listings and detail pages.
- `screenshot-1.png`: 1280x800px PNG showing the dictionary popup card with phonetics, definitions, and pronunciation audio button on a typical article webpage.
- `screenshot-2.png`: 1280x800px PNG showing the Preferences interface (modifier key selection, light/dark theme options, multi-word lookups).
- `promo-tile-440x280.png`: 440x280px small promotional banner required for Chrome Web Store featured placement and category browsing.

### Rationale
- The Chrome Web Store requires at least one 1280x800 or 640x400 screenshot and a 128x128 icon before a submission can be sent for review.
- Supplying pre-sized, branded assets in the repository allows developers to complete store listing creation without needing graphic design software or mockups.

---

## 5. Developer Deployment Guide & CI/CD Automation

### Decision
Update `README.md` with a comprehensive Chrome Web Store section that mirrors the quality of the Firefox AMO section, plus an optional appendix for automated CI/CD:
1. **Developer Registration**: Prerequisite checklist (Google account, $5 USD one-time registration fee, 2FA enablement).
2. **Building & Packaging**: Clear command `npm run package:chrome`.
3. **Store Listing Creation**:
   - Extension Title: `Simple English Dictionary`
   - Short Summary: `Double-click any word to view its pronunciation, definitions, and usage examples instantly.` (max 132 chars)
   - Categories: `Productivity` / `Tools`
   - Language: `English`
   - Graphic Assets: Pointing to `assets/store/` files.
4. **Privacy Practices Tab**:
   - Single Purpose declaration: English dictionary word lookup.
   - Host permissions rationale: `https://api.dictionaryapi.dev/*`, `https://en.wiktionary.org/*`, `https://en.wikipedia.org/*` solely for definition lookup.
   - Storage permission rationale: Storing user modifier key and theme preferences locally/synced.
   - User Data certification: Declare "This extension does not collect or use user data."
5. **Review Expectations**: Explanation of review status, typical review duration (24–72 hours), and rejection resolution.
6. **Appendix - GitHub Actions CI/CD Template**: Document an optional workflow leveraging `chrome-webstore-upload-cli` with Google API credentials (`CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`).

### Rationale
- Eliminates ambiguity and gives developers all required text, asset references, and policy disclosures in one place.
- Provides immediate manual deployment capability with a clear migration path to continuous deployment.
