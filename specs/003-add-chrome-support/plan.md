# Implementation Plan: Google Chrome Support and Chrome Web Store Deployment

**Branch**: `003-add-chrome-support` | **Date**: 2026-10-21 | **Spec**: [specs/003-add-chrome-support/spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-add-chrome-support/spec.md`

## Summary

Extend the Simple English Dictionary extension from Firefox-only to full Google Chrome and Chromium desktop compatibility (Manifest V3) while maintaining 100% regression-free backward compatibility for Mozilla Firefox. Introduces a dedicated multi-target build and packaging architecture that outputs `dist/chrome` (configured with `background.service_worker`) and `dist/firefox` (configured with `background.scripts` and `browser_specific_settings.gecko`), with dedicated npm commands (`build:chrome`, `build:firefox`, `package:chrome`, `package:firefox`, `package:all`). Pre-generates ready-to-upload store visual assets (128x128 store icon, 1280x800 screenshots, 440x280 promo banner) in `assets/store/`. Expands documentation in `README.md` with an end-to-end developer deployment guide for the Chrome Web Store covering account registration, store listing metadata, privacy policy disclosures, permissions justification, review timelines, and an optional appendix for GitHub Actions automated releases.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, Vanilla CSS  
**Primary Dependencies**: Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundling), Vitest (unit tests), web-ext (Firefox dev/lint)  
**Storage**: `chrome.storage.sync` / `browser.storage.sync` with automatic fallback to `local`  
**Testing**: Vitest for unit tests; local developer mode verification in `chrome://extensions` and Firefox debugging  
**Target Platform**: Google Chrome Desktop (stable releases, Manifest V3), Chromium-based desktop browsers (Edge, Brave), Mozilla Firefox 112+ Desktop  
**Project Type**: Browser Extension (Cross-browser WebExtension MV3)  
**Performance Goals**: <15s package generation; <300ms dictionary lookup rendering; 0ms background communication latency  
**Constraints**: Chrome Manifest V3 service worker lifecycle constraints (top-level synchronous message listener registration, async response handling with `return true`); strict ephemeral privacy (no user tracking or analytics); clean separate build directories avoiding git workspace churn  
**Scale/Scope**: Client-side browser extension supporting dual-browser distribution  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular Architecture**: Dedicated build and packaging scripts (`scripts/build.js`, `scripts/package.js`), browser-specific manifest templates, and clean `dist/chrome` and `dist/firefox` target directories ensure clear separation of concerns.
- **Test-First Validation**: Existing Vitest unit tests (covering word sanitization, dictionary response normalizer, viewport positioning, and storage logic) are preserved and expanded to validate cross-platform stability.
- **Simplicity & Privacy**: Uses native WebExtensions / Chrome runtime APIs without heavyweight wrapper libraries; maintains strictly ephemeral lookup lifecycle with zero telemetry or data collection; permissions restricted strictly to dictionary APIs and storage.
- **Gate Evaluation**: PASSED. Zero constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-add-chrome-support/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output (/speckit-plan output)
├── data-model.md        # Phase 1 output (/speckit-plan output)
├── quickstart.md        # Phase 1 output (/speckit-plan output)
├── contracts/           # Phase 1 output (/speckit-plan output)
│   ├── manifest-schema.md
│   ├── build-pipeline.md
│   └── store-listing.md
├── checklists/
│   └── requirements.md
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── manifest.chrome.json       # Manifest V3 template for Chrome (service_worker)
├── manifest.firefox.json      # Manifest V3 template for Firefox (background.scripts & gecko settings)
├── background/
│   ├── background.js          # Service worker / background event script (dual runtime message router)
│   ├── dictionary-service.js  # Dictionary API cascade coordinator
│   └── normalizers/           # Wiktionary, Wikipedia normalizers
├── content/
│   ├── content.js             # Double-click listener & runtime message dispatcher
│   ├── popup-view.js          # Shadow DOM component for card UI & audio
│   ├── floating-icon.js       # Multi-word floating trigger
│   └── popup.css              # Popup styling & micro-animations
├── options/
│   ├── options.html           # Settings interface
│   ├── options.js             # Settings controller
│   └── options.css            # Options styling
├── common/
│   ├── sanitize.js            # Word lemma cleaning & validation
│   ├── position.js            # Viewport-aware popup placement algorithm
│   └── storage.js             # Cross-browser storage helper & defaults
└── icons/                     # 16px, 48px, 128px addon icons

assets/
└── store/                     # Ready-to-upload visual assets for Chrome Web Store
    ├── store-icon-128.png     # 128x128 store icon
    ├── screenshot-1.png       # 1280x800 main word lookup screenshot
    ├── screenshot-2.png       # 1280x800 preferences screenshot
    └── promo-tile-440x280.png # 440x280 small promo banner

scripts/
├── build.js                   # Multi-target build script producing dist/chrome and dist/firefox
└── package.js                 # Zip packaging script generating store-ready release archives

dist/
├── chrome/                    # Clean Chrome MV3 build directory for local unpacked loading
└── firefox/                   # Clean Firefox MV3 build directory

web-ext-artifacts/             # Release archives (.zip) for Chrome and Firefox store submission

tests/
└── unit/                      # Vitest unit test suite
```

**Structure Decision**: Dual-target output pattern (`dist/chrome/` and `dist/firefox/`) built from shared `src/` modules via dedicated build script `scripts/build.js`. Preserves all existing unit test paths in `tests/unit/`. Adds `assets/store/` for turn-key Chrome Web Store listing assets.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
