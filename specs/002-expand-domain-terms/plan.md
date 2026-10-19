# Implementation Plan: Technical, Scientific, and Domain-Specific Vocabulary Lookup

**Branch**: `002-expand-domain-terms` | **Date**: 2026-10-19 | **Spec**: [specs/002-expand-domain-terms/spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-expand-domain-terms/spec.md`

## Summary

Extend the Firefox dictionary addon to reliably find definitions for technical, scientific, mathematical, business, and historical terms, as well as full-form acronym expansions (such as "AI → Artificial Intelligence"). Adopts an online-only multi-provider cascade combining Wiktionary REST API (case-sensitive acronyms and domain definitions), Wikipedia REST API Summary endpoint (encyclopedic summaries & historical eras), and Free Dictionary API (lexical & audio phonetics). To eliminate latency bottlenecks, queries utilize smart case-sensitive routing, concurrent provider dispatch, strict 2.5s network timeouts, and in-memory session caching. Supports multi-word compound term selection (2–4 words) via an unobtrusive floating icon or direct modifier drag, and presents ambiguous terms in a stacked view with the acronym expansion and domain definition prominently at the top.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, Vanilla CSS  
**Primary Dependencies**: Mozilla WebExtensions API (Firefox MV3), `web-ext` (local dev/run), Vitest (unit tests)  
**Storage**: `browser.storage.sync` with automatic fallback to `browser.storage.local` (for user trigger settings and preferences)  
**Testing**: Vitest for unit tests (multi-provider cascade router, response normalizers, sanitization with case preservation, multi-word selection bounds)  
**Target Platform**: Mozilla Firefox Desktop (Firefox 115+ ESR, Firefox 120+)  
**Project Type**: Browser Extension (Firefox Add-on / WebExtension MV3)  
**Performance Goals**: <300–500ms online lookup response; 0ms cascade latency bottleneck via smart query routing; <16ms UI response on floating icon render/dismiss  
**Constraints**: Online-only (no bundled offline dictionaries); strict per-provider timeout (≤2.5s); background script fetch to bypass host page CSP; Shadow DOM isolation for popup and floating icon; ephemeral privacy (no persistent lookup logs)  
**Scale/Scope**: Client-side extension operating across standard HTML web content  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular Architecture**: Response normalizers for Wiktionary and Wikipedia summary endpoints, query routing logic, and DOM rendering components are strictly decoupled, single-responsibility modules testable in isolation.
- **Test-First Validation**: Unit tests for multi-provider routing, acronym casing preservation, domain badge assignment, and multi-word selection logic ensure complete verification prior to manual browser testing.
- **Simplicity & Privacy**: Native `fetch` without heavyweight HTTP clients; ephemeral in-memory cache; zero external analytics or user tracking; host permissions limited strictly to dictionary APIs (`*.wiktionary.org`, `*.wikipedia.org`, `api.dictionaryapi.dev`).
- **Gate Evaluation**: PASSED. Zero constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-expand-domain-terms/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output (/speckit-plan output)
├── data-model.md        # Phase 1 output (/speckit-plan output)
├── quickstart.md        # Phase 1 output (/speckit-plan output)
├── contracts/           # Phase 1 output (/speckit-plan output)
│   ├── domain-api.md
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
├── manifest.json              # WebExtension MV3 manifest (host permissions for wiktionary & wikipedia)
├── background/
│   ├── background.js          # Service worker handling runtime messages (LOOKUP_DOMAIN_TERM)
│   ├── dictionary-service.js  # Smart query router & concurrent multi-provider coordinator
│   └── normalizers/
│       ├── wiktionary.js      # Wiktionary REST parser, acronym extraction, domain context tags
│       └── wikipedia.js       # Wikipedia summary parser, extract & description formatting
├── content/
│   ├── content.js             # Double-click & multi-word mouseup selection listener
│   ├── floating-icon.js       # Unobtrusive floating dictionary trigger button for 2-4 words
│   ├── popup-view.js          # Shadow DOM component rendering stacked disambiguation & domain badges
│   └── popup.css              # Shadow DOM styles (domain badge colors, stacked sections, floating icon)
├── options/
│   ├── options.html           # Settings UI (modifier key, multi-word toggle, domain badges toggle)
│   ├── options.js             # Options logic and storage binding
│   └── options.css            # Options styling
├── common/
│   ├── sanitize.js            # Case-preserving sanitization for single words, acronyms, and 2-4 words
│   ├── domain-detector.js     # Domain classifier (Computing, Science, Math, Business, History)
│   ├── position.js            # Viewport-aware popup & floating icon placement
│   └── storage.js             # Storage wrapper for settings with defaults
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png

tests/
├── unit/
│   ├── dictionary-service.test.js # Smart routing, concurrency, cache, and timeout handling
│   ├── wiktionary.test.js         # Wiktionary HTML cleaning, acronym detection, domain tags
│   ├── wikipedia.test.js          # Wikipedia summary parsing & fallback handling
│   ├── sanitize.test.js           # Case preservation, acronym periods (A.I.), multi-word bounds
│   ├── position.test.js           # Viewport placement & floating icon offset logic
│   └── storage.test.js            # Settings persistence and default configurations
└── setup.js
```

**Structure Decision**: Standard browser extension layout with separated `background/`, `content/`, `options/`, and `common/` modules. Extends `background/` with specialized normalizers for Wiktionary and Wikipedia, and extends `content/` with floating-icon handling for multi-word phrases and stacked view rendering.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
