# Manifest Schema Contract: Chrome MV3 vs. Firefox MV3

**Feature**: `003-add-chrome-support`  
**Date**: 2026-10-21  

---

## 1. Google Chrome Manifest (`dist/chrome/manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Simple English Dictionary",
  "version": "<VERSION>",
  "description": "Double-click any word to view its pronunciation, definitions, and usage examples instantly.",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "service_worker": "background/background.bundle.js"
  },
  "content_scripts": [
    {
      "matches": [
        "<all_urls>"
      ],
      "js": [
        "content/content.bundle.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    },
    "default_title": "Simple English Dictionary Preferences",
    "default_popup": "options/options.html"
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": false
  },
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://api.dictionaryapi.dev/*",
    "https://en.wiktionary.org/*",
    "https://en.wikipedia.org/*"
  ]
}
```

### Key Chrome Constraints
- **Background**: MUST use `"service_worker"`. Chrome will reject any array under `background.scripts`.
- **Gecko Settings**: MUST NOT include `browser_specific_settings`. Chrome reports unrecognized key warnings.

---

## 2. Mozilla Firefox Manifest (`dist/firefox/manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Simple English Dictionary",
  "version": "<VERSION>",
  "description": "Double-click any word to view its pronunciation, definitions, and usage examples instantly.",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "scripts": [
      "background/background.bundle.js"
    ]
  },
  "content_scripts": [
    {
      "matches": [
        "<all_urls>"
      ],
      "js": [
        "content/content.bundle.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    },
    "default_title": "Simple English Dictionary Preferences",
    "default_popup": "options/options.html"
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": false
  },
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://api.dictionaryapi.dev/*",
    "https://en.wiktionary.org/*",
    "https://en.wikipedia.org/*"
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "english-dictionary@antigravity.dev",
      "strict_min_version": "112.0",
      "data_collection_permissions": {
        "required": [
          "none"
        ]
      }
    }
  }
}
```

### Key Firefox Constraints
- **Background**: Uses `background.scripts` array for maximum compatibility with Firefox ESR and standard releases.
- **Gecko ID**: MUST include `browser_specific_settings.gecko.id` for AMO signing and debugging.
