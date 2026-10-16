# Implementation Plan: English Dictionary Firefox Addon

**Branch**: `001-dictionary-word-lookup` | **Date**: 2026-10-16 | **Spec**: [specs/001-dictionary-word-lookup/spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-dictionary-word-lookup/spec.md`

## Summary

Build an intuitive, lightweight English dictionary Firefox addon (Manifest V3) that displays a floating definition card when a user double-clicks any word on a webpage. The content script encapsulates UI in a Shadow DOM for style isolation and communicates via runtime messaging with a background service worker that queries the public Free Dictionary API (`api.dictionaryapi.dev`). Includes audio pronunciation playback, customizable modifier key triggering (None, Alt, Ctrl, Shift), and options management via `browser.storage`.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, Vanilla CSS  
**Primary Dependencies**: Mozilla WebExtensions API (Firefox MV3), `web-ext` (local dev/run), Vitest (unit tests)  
**Storage**: `browser.storage.sync` with automatic fallback to `browser.storage.local` (for user trigger settings)  
**Testing**: Vitest for parser, sanitization, modifier matching, and positioning calculations  
**Target Platform**: Mozilla Firefox Desktop (Firefox 115+ ESR, Firefox 120+)  
**Project Type**: Browser Extension (Firefox Add-on / WebExtension MV3)  
**Performance Goals**: <300ms popup render after double-click; <16ms interaction response on dismissal  
**Constraints**: Delegate network fetches to background script to bypass host page CSP; Shadow DOM isolation to prevent host page CSS interference; strictly ephemeral (no search history or telemetry persisted)  
**Scale/Scope**: Client-side extension operating across standard HTML web content  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Library-First / Modular Architecture**: Core utilities (`sanitize.js`, `position.js`, `dictionary-service.js`, `storage.js`) are decoupled, single-responsibility modules testable outside of the browser environment.
- **Test-First Validation**: Unit tests for sanitization, response parsing, and viewport positioning ensure verification prior to end-to-end browser integration.
- **Simplicity & Privacy**: Zero complex build toolchain required for the addon runtime; minimal permissions (`storage`, host permissions for `api.dictionaryapi.dev`); strictly ephemeral operation without tracking.
- **Gate Evaluation**: PASSED. No constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-dictionary-word-lookup/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output (/speckit-plan output)
├── data-model.md        # Phase 1 output (/speckit-plan output)
├── quickstart.md        # Phase 1 output (/speckit-plan output)
├── contracts/           # Phase 1 output (/speckit-plan output)
│   ├── dictionary-api.md
│   ├── runtime-messages.md
│   └── storage-schema.md
├── checklists/
│   └── requirements.md
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── manifest.json              # WebExtension Manifest V3 declaration
├── background/
│   ├── background.js          # Service worker / background script (API fetch, message dispatch)
│   └── dictionary-service.js  # Free Dictionary API fetcher and response normalizer
├── content/
│   ├── content.js             # Double-click listener, selection bounding box, trigger check
│   ├── popup-view.js          # Shadow DOM component rendering card UI, audio, dismiss
│   └── popup.css              # Shadow DOM styles (card layout, typography, animations)
├── options/
│   ├── options.html           # Settings UI (modifier key selection, enable/disable)
│   ├── options.js             # Options logic and browser.storage.sync binding
│   └── options.css            # Clean, modern options styling
├── common/
│   ├── sanitize.js            # Word lemma cleaning and validation
│   ├── position.js            # Viewport-aware popup placement algorithm
│   └── storage.js             # Storage wrapper for settings with defaults
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png

tests/
├── unit/
│   ├── sanitize.test.js       # Punctuation trimming, non-words, word length checks
│   ├── dictionary-service.test.js # API response parser, phonetics and audio extraction
│   ├── position.test.js       # Viewport boundary collision and flip logic
│   └── storage.test.js        # Default config and storage schema validation
└── setup.js

package.json
```

**Structure Decision**: Standard browser extension layout with separated `background/`, `content/`, `options/`, and `common/` modules. This ensures clear boundaries between the background service, the injected DOM scripts, the user options interface, and the shared logic.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
