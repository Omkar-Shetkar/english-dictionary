# English Dictionary Firefox Addon 📖⚡

A simple, fast, and intuitive English dictionary addon for Mozilla Firefox (Manifest V3). Double-click any word on any webpage to immediately view its pronunciation, definition, and usage examples without leaving your tab.

---

## ✨ Features

- ⚡ **Instant Word Lookup**: Double-click any word on any webpage to view its definition in an elegant, non-intrusive floating card.
- 🔊 **Spoken Pronunciation**: Listen to audio pronunciation recordings directly from the popup with a single click.
- 🔤 **Phonetic IPA Transcription**: Clear phonetic spelling displayed for every supported vocabulary word.
- 🎯 **Configurable Key Triggers**: Choose your preferred trigger in preferences:
  - **Direct Double-Click** (Default)
  - **Alt + Double-Click** (Recommended for users who frequently copy/edit text)
  - **Ctrl / Cmd + Double-Click**
  - **Shift + Double-Click**
- 🛡️ **Shadow DOM Style Isolation**: Popup card is encapsulated within a closed-style Shadow DOM root, guaranteeing zero style conflicts with host websites.
- 🔒 **Privacy-First & Strictly Ephemeral**: Zero search history or telemetry tracking. Searches are performed on-demand via the free public [Free Dictionary API](https://api.dictionaryapi.dev).
- 🌓 **Adaptive Theme**: Smooth glassmorphic appearance supporting both Light and Dark modes.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and `npm`
- Mozilla Firefox 112+ (Desktop)

### Installation & Local Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build and launch in Firefox**:
   ```bash
   npm start
   ```
   *This bundles the content script and launches a clean temporary Firefox profile with live reload.*

3. **Manual Loading in Existing Firefox**:
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
   - Click **"Load Temporary Add-on..."**.
   - Select `src/manifest.json`.

---

## 🧪 Testing

Run the Vitest test suite covering word sanitization, dictionary response normalizer, viewport positioning, and storage logic:

```bash
npm test
```

Lint manifest and scripts with Mozilla `web-ext`:

```bash
npm run lint
```

---

## 📦 Packaging & Publishing (Mozilla AMO)

### 1. Build & Package
Generate the production zip package and clean source code archive for Mozilla reviewers:

```bash
# Package extension into web-ext-artifacts/
npm run package

# Create source code archive (required by AMO for esbuild bundled code)
npm run package:source
```

### 2. Submit to Firefox Add-ons (AMO)
1. Log in to [AMO Developer Hub](https://addons.mozilla.org/developers/).
2. Click **Submit a New Add-on**.
3. Select distribution: **On this site** (publicly listed on AMO) or **On your own** (unlisted/self-hosted).
4. Upload `web-ext-artifacts/english_dictionary_-_double-click_lookup-1.0.0.zip`.
5. Under **Source Code Submission**, select **Yes** and upload `web-ext-artifacts/source-code.zip` with build instructions:
   ```bash
   npm install && npm run build
   ```
6. Fill in listing metadata (name, description, tags, screenshots) and submit for review.

---

## 🛠️ Project Structure

```text
src/
├── manifest.json              # WebExtension Manifest V3
├── background/
│   ├── background.js          # Service worker message dispatcher
│   └── dictionary-service.js  # Free Dictionary API fetcher & normalizer
├── content/
│   ├── content.js             # Double-click listener & coordinator
│   ├── popup-view.js          # Shadow DOM component for card UI & audio
│   ├── popup.css              # Popup styling & micro-animations
│   └── popup-styles.js        # Bundled popup CSS string
├── options/
│   ├── options.html           # Settings interface
│   ├── options.js             # Settings controller
│   └── options.css            # Options page styling
├── common/
│   ├── sanitize.js            # Word lemma cleaning & validation
│   ├── position.js            # Viewport-aware popup placement algorithm
│   └── storage.js             # Settings storage helper & defaults
└── icons/                     # 16px, 48px, 128px addon icons

tests/
└── unit/
    ├── sanitize.test.js       # Sanitization unit tests
    ├── dictionary-service.test.js # API response parser unit tests
    ├── position.test.js       # Viewport boundary unit tests
    └── storage.test.js        # Configuration schema unit tests
```

---

## 📄 License

MIT © [Omkar Shetkar](https://github.com/Omkar-Shetkar)
