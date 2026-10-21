# Data Model: Google Chrome Support and Multi-Target Distribution

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  
**Spec Reference**: [specs/003-add-chrome-support/spec.md](spec.md)

---

## 1. Core Entities

### BrowserTarget
Represents a supported browser runtime target and its associated manifest configuration, build directory, and packaging constraints.

| Field | Type | Description | Values / Examples |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique browser identifier | `'chrome'` \| `'firefox'` |
| `name` | `string` | Human-readable platform name | `'Google Chrome'` \| `'Mozilla Firefox'` |
| `outputDir` | `string` | Build distribution directory | `'dist/chrome'` \| `'dist/firefox'` |
| `manifestSource` | `string` | Source manifest template path | `'src/manifest.chrome.json'` \| `'src/manifest.firefox.json'` |
| `backgroundModel`| `string` | Background execution architecture | `'service_worker'` (Chrome) \| `'scripts'` (Firefox) |
| `packagePath` | `string` | Output zip artifact path | `'web-ext-artifacts/simple-english-dictionary-<target>-<version>.zip'` |

### ExtensionPackage
Represents the assembled build distribution directory and zipped artifact ready for browser loading or store distribution.

| Field | Type | Description | Validation Rules |
| :--- | :--- | :--- | :--- |
| `target` | `BrowserTarget` | Target browser specification | Must be valid registered target |
| `version` | `string` | Extension version string | SemVer compliant (`MAJOR.MINOR.PATCH`) |
| `manifest` | `object` | Parsed browser-specific manifest | Must pass browser-specific MV3 schema check |
| `files` | `string[]` | List of included bundled scripts, styles, icons | Required: `manifest.json`, bundled scripts, icons |
| `artifact` | `string` | Absolute path to generated zip archive | Must be valid uncorrupted zip |

### StoreAssetBundle
Represents the collection of graphic assets committed to the repository for Chrome Web Store listing.

| Asset | File Path | Dimensions | Format | Mandatory for Submission |
| :--- | :--- | :--- | :--- | :--- |
| **Store Icon** | `assets/store/store-icon-128.png` | 128 x 128 px | PNG | Yes (Primary store listing icon) |
| **Screenshot 1** | `assets/store/screenshot-1.png` | 1280 x 800 px | PNG | Yes (Word popup in action) |
| **Screenshot 2** | `assets/store/screenshot-2.png` | 1280 x 800 px | PNG | Optional but Recommended (Preferences UI) |
| **Promo Tile** | `assets/store/promo-tile-440x280.png` | 440 x 280 px | PNG | Optional (Recommended for store feature cards) |

### StoreListingMetadata
The publication metadata required by the Google Chrome Web Store Developer Dashboard.

| Attribute | Value / Specification | Constraints |
| :--- | :--- | :--- |
| `title` | `Simple English Dictionary` | ≤ 45 characters |
| `shortDescription` | `Double-click any word to view its pronunciation, definitions, and usage examples instantly.` | ≤ 132 characters |
| `primaryCategory` | `Productivity` | Valid Chrome Web Store category |
| `secondaryCategory`| `Tools` | Optional secondary category |
| `language` | `English` | Primary interface language |
| `privacyJustifications`| Object mapping each requested permission to its justification | Required for all permissions |
| `dataCollection` | Zero data collection declaration | Required policy certification |

---

## 2. Build Lifecycle and State Transitions

```
[Source Code in src/]
         │
         ├───► npm run build:chrome ───► Compile Bundles ───► Write dist/chrome/manifest.json ───► [dist/chrome Directory]
         │                                                                                                  │
         │                                                                                      npm run package:chrome
         │                                                                                                  │
         │                                                                                                  ▼
         │                                                                                [web-ext-artifacts/*-chrome.zip]
         │
         └───► npm run build:firefox ──► Compile Bundles ───► Write dist/firefox/manifest.json ──► [dist/firefox Directory]
                                                                                                            │
                                                                                                npm run package:firefox
                                                                                                            │
                                                                                                            ▼
                                                                                [web-ext-artifacts/*-firefox.zip]
```

---

## 3. Storage Entity Consistency
The runtime configuration stored in `browser.storage.sync` / `chrome.storage.sync` remains unchanged across both browsers:

```json
{
  "settings": {
    "modifierKey": "none" | "alt" | "ctrl" | "shift",
    "enabled": true,
    "theme": "auto" | "light" | "dark",
    "multiWordEnabled": true,
    "domainBadgesEnabled": true,
    "schemaVersion": 2
  }
}
```
All fields are validated upon retrieval via `src/common/storage.js:validateConfig`.
