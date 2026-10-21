# Chrome Web Store Listing Contract

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  

---

## 1. Store Listing Metadata Fields

| Field | Content / Specification |
| :--- | :--- |
| **Extension Name** | `Simple English Dictionary` |
| **Short Description** | `Double-click any word to view its pronunciation, definitions, and usage examples instantly.` |
| **Category** | `Productivity` (Primary), `Workflow & Planning` or `Tools` (Secondary) |
| **Language** | `English` |
| **Visibility** | `Public` (recommended for general distribution) or `Unlisted` |
| **Pricing** | `Free` (No in-app purchases, no subscriptions) |

---

## 2. Graphic Asset Contract

| Asset | Path in Repo | File Format | Required Dimensions | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Store Icon** | `assets/store/store-icon-128.png` | PNG (transparent background) | `128 x 128 px` | Displayed in search results and store detail page |
| **Screenshot 1** | `assets/store/screenshot-1.png` | PNG or JPEG | `1280 x 800 px` | Main showcase: Double-click popup with definition, phonetics, audio icon |
| **Screenshot 2** | `assets/store/screenshot-2.png` | PNG or JPEG | `1280 x 800 px` | Feature showcase: Preferences page (modifier key, dark mode, multi-word) |
| **Promo Tile** | `assets/store/promo-tile-440x280.png` | PNG or JPEG | `440 x 280 px` | Displayed on Chrome Web Store category and promotional pages |

---

## 3. Privacy Policy & Permission Justifications Contract

Under the **Privacy** tab of the Chrome Developer Dashboard, the developer MUST provide these explicit justifications:

### Single Purpose Declaration
- *"Simple English Dictionary provides instant English dictionary definitions, pronunciations, and usage examples when the user double-clicks a word on any webpage."*

### Permission Justifications
- **`storage`**:
  - *"Required to persist user preferences (such as modifier key requirements, dark/light theme choice, and multi-word selection toggle) across browser sessions."*
- **`host_permissions` (`https://api.dictionaryapi.dev/*`, `https://en.wiktionary.org/*`, `https://en.wikipedia.org/*`)**:
  - *"Required to fetch lexical definitions, phonetics, audio files, and domain summaries on-demand when the user selects a word or acronym to look up."*

### Data Usage Certifications
- **Personal Data**: Select **"No"** for all categories (No personally identifiable info, health info, financial info, authentication info, personal communications, browsing history, user activity, or website content collected).
- **Compliance Checkbox**: Check *"I certify that this extension complies with the Chrome Web Store Developer Program Policies."*
