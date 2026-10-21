# Quickstart: Google Chrome Support & Chrome Web Store Publishing

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  

This quickstart guide covers local development, packaging, and store deployment for Google Chrome alongside Mozilla Firefox.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **Browsers**: Google Chrome (or Chromium-based browser like Brave/Edge) and Mozilla Firefox

---

## 2. Local Development & Testing

### Google Chrome
1. **Build the Chrome distribution**:
   ```bash
   npm run build:chrome
   ```
   *This compiles all bundles and creates `dist/chrome/` with a Manifest V3 service worker configuration.*

2. **Load into Google Chrome**:
   - Open Google Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** toggle in the top-right corner.
   - Click **Load unpacked** in the top-left toolbar.
   - Select the `dist/chrome` directory from this project.
   - The extension will appear with the icon and preferences popup active.

3. **Test features**:
   - Visit any website (e.g., Wikipedia or news article).
   - Double-click an English word to verify the popup appears near the word.
   - Click the pronunciation speaker icon to verify audio playback.
   - Click the extension icon in the toolbar, change trigger key to "Alt + Double-click", and test.

---

### Mozilla Firefox
1. **Launch with live reload**:
   ```bash
   npm start
   ```
   *This builds `dist/firefox/` and boots a temporary Firefox test profile.*

2. **Run test suite**:
   ```bash
   npm test
   ```

---

## 3. Packaging for Store Submission

### Google Chrome Web Store
1. **Generate the Chrome zip package**:
   ```bash
   npm run package:chrome
   ```
   *Outputs a clean, review-ready archive at `web-ext-artifacts/simple-english-dictionary-chrome-<version>.zip`.*

### Mozilla Firefox Add-ons (AMO)
1. **Generate the Firefox zip package**:
   ```bash
   npm run package:firefox
   ```
   *Outputs `web-ext-artifacts/simple-english-dictionary-firefox-<version>.zip` and source code archive.*

---

## 4. Google Chrome Web Store Publishing Workflow

1. **Access Chrome Developer Dashboard**:
   - Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - Pay the one-time $5 USD developer registration fee if creating a new account.
2. **Add New Item**:
   - Click **New Item** and upload `web-ext-artifacts/simple-english-dictionary-chrome-<version>.zip`.
3. **Fill Store Listing Details**:
   - Title: `Simple English Dictionary`
   - Description: Use the description template in `README.md`.
   - Category: `Productivity`.
4. **Upload Store Assets**:
   - Store Icon: Upload `assets/store/store-icon-128.png`.
   - Screenshots: Upload `assets/store/screenshot-1.png` and `assets/store/screenshot-2.png`.
   - Small Tile: Upload `assets/store/promo-tile-440x280.png`.
5. **Complete Privacy Tab**:
   - Single purpose: Instant English dictionary lookup on double-click.
   - Host permissions: `https://api.dictionaryapi.dev/*`, `https://en.wiktionary.org/*`, `https://en.wikipedia.org/*`.
   - Data collection: Check "No" for all user data categories.
6. **Submit for Review**:
   - Click **Submit for Review**. Review typically takes 24–72 hours.
