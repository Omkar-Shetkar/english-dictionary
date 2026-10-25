# Simple English Dictionary 📖⚡ (Chrome & Firefox)

A simple, fast, and intuitive English dictionary browser extension for **Google Chrome** and **Mozilla Firefox** (Manifest V3). Double-click any word on any webpage to immediately view its pronunciation, definition, and usage examples without leaving your tab.

---

## ✨ Features

- ⚡ **Instant Word Lookup**: Double-click any word on any webpage to view its definition in an elegant, non-intrusive floating card.
- 📄 **PDF Document Support**: Double-click or right-click to look up words in web-hosted and local PDF documents opened in your browser.
- 🖱️ **Right-Click Context Menu**: Select any word or phrase and choose "Look up in Simple English Dictionary" as a dependable lookup fallback.
- 🔊 **Spoken Pronunciation**: Listen to audio pronunciation recordings directly from the popup with a single click.
- 🔤 **Phonetic IPA Transcription**: Clear phonetic spelling displayed for every supported vocabulary word.
- 🎯 **Configurable Key Triggers**: Choose your preferred trigger in preferences:
  - **Direct Double-Click** (Default)
  - **Alt + Double-Click** (Recommended for users who frequently copy/edit text)
  - **Ctrl / Cmd + Double-Click**
  - **Shift + Double-Click**
- 🛡️ **Shadow DOM Style Isolation**: Popup card is encapsulated within a closed-style Shadow DOM root, guaranteeing zero style conflicts with host websites on all browsers.
- 🔒 **Privacy-First & Strictly Ephemeral**: Zero search history or telemetry tracking. Searches are performed on-demand via free public lexical services ([Free Dictionary API](https://api.dictionaryapi.dev), Wiktionary, Wikipedia).
- 🌓 **Adaptive Theme**: Smooth glassmorphic appearance supporting both Light and Dark modes.
- 🌐 **Cross-Browser Multi-Target**: Dedicated, compliant Manifest V3 distributions for Google Chrome (service worker) and Mozilla Firefox (background scripts & Gecko ID).

---

### 📄 Working with PDF Documents

Simple English Dictionary works seamlessly on PDF documents opened inside Google Chrome and Mozilla Firefox:

- **Web-Hosted PDFs (`https://.../*.pdf`)**:
  - Double-click any word or drag-select a phrase (2 to 4 words).
  - The dictionary popup card anchors smoothly near your selection.
  - Right-click and choose **"Look up in Simple English Dictionary"** for an instant context-menu lookup.
- **Local PDF Files (`file:///...`)**:
  - Due to browser platform security sandboxes, extensions require user consent to read local `file://` URLs.
  - **Google Chrome / Chromium**: Navigate to `chrome://extensions`, click **Details** under Simple English Dictionary, and toggle on **"Allow access to file URLs"**.
  - **Mozilla Firefox**: Navigate to `about:addons`, click Simple English Dictionary, and ensure local file access permissions are granted under Details.
  - Check the live **Local File Access** status pill in extension preferences for confirmation.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and `npm`
- Google Chrome (or Chromium-based browser like Brave/Edge) and/or Mozilla Firefox 112+

### Installation & Local Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Google Chrome (Local Unpacked Loading)**:
   ```bash
   # Build the Chrome distribution
   npm run build:chrome
   ```
   - Open Google Chrome and navigate to `chrome://extensions`.
   - Enable the **Developer mode** toggle in the top-right corner.
   - Click **Load unpacked** in the top-left toolbar.
   - Select the `dist/chrome` folder in this repository.
   - The extension will appear in your extensions list and toolbar ready for testing.

3. **Mozilla Firefox (Live Run)**:
   ```bash
   # Launch temporary Firefox profile with live reload
   npm start
   ```

---

## 🧪 Testing & Linting

Run the Vitest test suite covering word sanitization, dictionary response normalizers, viewport positioning, storage logic, and manifest schemas:

```bash
npm test
```

Lint the Firefox extension manifest and bundles with Mozilla `web-ext`:

```bash
npm run lint
```

---

## 📦 Packaging & Publishing: Google Chrome Web Store

Follow this step-by-step developer guide to publish or update the extension in the Chrome Web Store.

### 1. Developer Account Registration
- Navigate to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- Sign in with your developer Google account.
- Pay the one-time **$5 USD** registration fee (required by Google for developer verification).
- Ensure Two-Factor Authentication (2FA) is enabled on your Google account.

### 2. Generate the Chrome Release Package
Build the distribution and create the store-ready `.zip` archive:

```bash
npm run package:chrome
```

This validates `dist/chrome` and outputs:
```text
web-ext-artifacts/simple-english-dictionary-chrome-<version>.zip
```
*(The package contains `manifest.json` at the archive root with zero unnecessary files).*

### 3. Upload to the Chrome Developer Dashboard
1. In the Chrome Developer Dashboard, click **Add new item** (or select your existing item for an update).
2. Drag and drop `web-ext-artifacts/simple-english-dictionary-chrome-<version>.zip` into the uploader.

### 4. Configure Store Listing Details

| Field | Recommended Value |
| :--- | :--- |
| **Extension Name** | `Simple English Dictionary` |
| **Summary (Short)** | `Double-click any word to view its pronunciation, definitions, and usage examples instantly.` *(Max 132 chars)* |
| **Description** | Copy the feature highlights from this README (clean formatting, no markdown tags). |
| **Category** | `Productivity` (Primary) and `Tools` (Secondary) |
| **Language** | `English` |
| **Visibility** | `Public` (or `Unlisted` if testing internally) |

### 5. Upload Ready Store Visual Assets
Pre-formatted, store-ready graphic assets are provided in the [`assets/store/`](file:///Users/omkar/projects/english-dictionary/assets/store) directory:

- **Store Icon (128x128 px)**: Upload `assets/store/store-icon-128.png` under **Store icon**.
- **Screenshots (1280x800 px)**: Upload both screenshots under **Screenshots**:
  - `assets/store/screenshot-1.png` (Main word lookup card demo)
  - `assets/store/screenshot-2.png` (Preferences and settings interface demo)
- **Small Promo Tile (440x280 px)**: Upload `assets/store/promo-tile-440x280.png` under **Promotional images > Small tile**.

### 6. Complete the Privacy Practices Tab
Google Chrome Web Store strictly enforces privacy and permission disclosures:

1. **Single Purpose**:
   > *"Simple English Dictionary provides instant English dictionary definitions, pronunciations, and usage examples when the user double-clicks a word on any webpage."*
2. **Permission Justifications**:
   - `storage`: *"Required to save and synchronize user preferences (modifier key requirement, theme, and multi-word selection toggle) across browser sessions."*
   - `host_permissions` (`https://api.dictionaryapi.dev/*`, `https://en.wiktionary.org/*`, `https://en.wikipedia.org/*`): *"Required to fetch word definitions, phonetic IPA notations, pronunciation audio files, and technical domain term summaries on-demand when user performs a lookup."*
3. **Data Usage Certification**:
   - Check **"No"** for all categories of user data collection (the extension is strictly ephemeral and collects zero personal data, browsing history, or analytics).
   - Check the certification confirming compliance with the Chrome Web Store Developer Program Policies.

### 7. Submit for Review
1. Click **Submit for Review**.
2. **Review Timelines**: Standard reviews typically complete within **24 to 72 hours**.
3. Once approved, the extension is automatically published to the Chrome Web Store.

---

### 🤖 Appendix: Automated CI/CD Release (GitHub Actions)

To automate Chrome Web Store deployments on GitHub release tags, you can configure a GitHub Actions workflow using Google API credentials:

1. Follow Google's guide to generate Chrome Web Store API credentials (`CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `EXTENSION_ID`).
2. Add these as GitHub Repository Secrets.
3. Use this sample workflow (`.github/workflows/release-chrome.yml`):

```yaml
name: Release to Chrome Web Store

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run package:chrome
      - name: Upload to Chrome Web Store
        uses: mnao305/chrome-extension-upload@v5.0.0
        with:
          file-path: web-ext-artifacts/simple-english-dictionary-chrome-*.zip
          extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
```

---

## 📦 Packaging & Publishing: Mozilla Firefox (AMO)

### 1. Build & Package
```bash
# Package extension into web-ext-artifacts/
npm run package:firefox

# Create clean source code archive for Mozilla reviewers
npm run package:source
```

### 2. Submit to Firefox Add-ons (AMO)
1. Log in to the [AMO Developer Hub](https://addons.mozilla.org/developers/).
2. Click **Submit a New Add-on**.
3. Select distribution: **On this site** (public) or **On your own** (unlisted).
4. Upload `web-ext-artifacts/simple-english-dictionary-firefox-*.zip`.
5. Under **Source Code Submission**, select **Yes** and upload `web-ext-artifacts/source-code.zip` with build instructions:
   ```bash
   npm install && npm run build:firefox
   ```
6. Submit for review.

---

## 🛠️ Project Structure

```text
src/
├── manifest.chrome.json       # Chrome Manifest V3 template (service_worker)
├── manifest.firefox.json      # Firefox Manifest V3 template (background.scripts & gecko ID)
├── background/
│   ├── background.js          # Dual-runtime background service worker & message dispatcher
│   ├── dictionary-service.js  # Free Dictionary, Wiktionary, & Wikipedia cascade router
│   └── normalizers/           # API response normalizers
├── content/
│   ├── content.js             # Double-click listener & coordinator
│   ├── popup-view.js          # Shadow DOM component for card UI & audio
│   ├── floating-icon.js       # Multi-word floating trigger
│   ├── popup.css              # Popup styling & micro-animations
│   └── popup-styles.js        # Bundled popup CSS string
├── options/
│   ├── options.html           # Settings interface
│   ├── options.js             # Settings controller
│   └── options.css            # Options page styling
├── common/
│   ├── sanitize.js            # Word lemma cleaning & validation
│   ├── position.js            # Viewport-aware popup placement algorithm
│   └── storage.js             # Cross-browser storage helper & defaults
└── icons/                     # 16px, 48px, 128px extension icons

assets/
└── store/                     # Ready-to-upload visual assets for Chrome Web Store
    ├── store-icon-128.png     # 128x128 store icon
    ├── screenshot-1.png       # 1280x800 main lookup screenshot
    ├── screenshot-2.png       # 1280x800 preferences screenshot
    └── promo-tile-440x280.png # 440x280 small promo banner

scripts/
├── build.js                   # Compiles dist/chrome and dist/firefox
└── package.js                 # Generates clean release zip archives

dist/
├── chrome/                    # Assembled Chrome MV3 build (Load unpacked here)
└── firefox/                   # Assembled Firefox MV3 build

web-ext-artifacts/             # Release archives (.zip) for Chrome and Firefox

tests/
└── unit/                      # Vitest unit test suites
```

---

## 📄 License

MIT © [Omkar Shetkar](https://github.com/Omkar-Shetkar)
