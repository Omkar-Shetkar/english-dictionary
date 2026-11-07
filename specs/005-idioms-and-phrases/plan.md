# Implementation Plan: Idioms and Phrasal Expressions Lookup

**Branch**: `005-idioms-and-phrases` | **Date**: 2026-11-07 | **Spec**: [specs/005-idioms-and-phrases/spec.md](spec.md)  
**Input**: Feature specification from `/specs/005-idioms-and-phrases/spec.md`

## Summary

Extend Simple English Dictionary (Chrome & Firefox MV3) to recognize and define multi-word idioms, proverbs, sayings, and phrasal verbs (ranging from 2 to 8 words). Implements candidate query lemmatization to handle irregular past-tense conjugations, continuous participles, and personalized pronoun substitutions (e.g., "bit the bullet" → "bite the bullet", "pulling his leg" → "pull someone's leg"). Queries Wiktionary REST API, Free Dictionary API, and Wikipedia Summary concurrently with strict 2.5s timeouts and in-memory caching. Renders figurative definitions with clear `[Idiom]`, `[Phrasal Verb]`, and `[Proverb]` badges, groups literal meanings into a secondary section, and enriches single-word lookups with a clickable "Related Idioms & Phrases" recommendation list.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, Vanilla CSS  
**Primary Dependencies**: WebExtensions API (Chrome MV3 service worker & Firefox MV3 background script), `web-ext` (Firefox dev runner), Vitest (unit tests)  
**Storage**: `chrome.storage.sync` / `browser.storage.sync` with fallback to `storage.local` (user trigger settings and preferences)  
**Testing**: Vitest for unit tests (phrase sanitization, lemmatization and pronoun mapping, multi-provider idiom normalizers, viewport positioning)  
**Target Platform**: Google Chrome / Chromium-based browsers & Mozilla Firefox 115+  
**Project Type**: Cross-Browser WebExtension (Manifest V3)  
**Performance Goals**: <300–500ms online lookup response; in-memory cache hit <10ms; zero cascade bottleneck; <16ms UI render/dismiss  
**Constraints**: Online-only lexical cascade with zero bulky bundled offline databases; strict 2.5s timeout per provider via `AbortController`; Shadow DOM style encapsulation; privacy-first ephemeral cache (no persistent search logs or telemetry)  
**Scale/Scope**: Multi-word phrase selections up to 8 words across web pages and browser PDF readers  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular Architecture**: Phrase sanitization, candidate lemmatization (`phrase-normalizer.js`), multi-provider routing (`dictionary-service.js`), and Shadow DOM UI components (`popup-view.js`, `floating-icon.js`) are decoupled, single-responsibility modules testable in isolation.
- **Test-First Validation**: Unit tests for phrase sanitization up to 8 words, verb lemmatization, pronoun pattern normalization, idiom badge assignment, and related-phrase navigation guarantee verification before browser deployment.
- **Simplicity & Privacy**: Native `fetch` with `AbortController`; in-memory ephemeral cache (max 100 entries); zero user tracking or telemetry; host permissions unchanged (`*.wiktionary.org`, `*.wikipedia.org`, `api.dictionaryapi.dev`).
- **Gate Evaluation**: PASSED. Zero constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-idioms-and-phrases/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output (/speckit-plan output)
├── data-model.md        # Phase 1 output (/speckit-plan output)
├── quickstart.md        # Phase 1 output (/speckit-plan output)
├── contracts/           # Phase 1 output (/speckit-plan output)
│   ├── idiom-api.md
│   └── runtime-messages.md
├── checklists/
│   └── requirements.md
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── background/
│   ├── background.js              # Background service worker / listener for LOOKUP_DOMAIN_TERM
│   ├── dictionary-service.js      # Multi-provider cascade router with idiom candidate fallback
│   ├── phrase-normalizer.js       # Verb lemmatization & pronoun wildcard mapping
│   ├── idiom-index.js             # High-frequency keyword-to-idiom index for related phrases
│   └── normalizers/
│       ├── wiktionary.js          # Wiktionary REST parser: extracts phrase, idiom, proverb, etymology
│       └── wikipedia.js           # Wikipedia summary parser for cultural and historical sayings
├── content/
│   ├── content.js                 # Double-click & multi-word mouseup selection listener (2-8 words)
│   ├── floating-icon.js           # Floating lookup trigger for multi-word phrases
│   ├── popup-view.js              # Shadow DOM renderer for idiom badges, origin, and related idioms
│   ├── popup.css                  # Shadow DOM styles (idiom/phrasal badges, origin, related chips)
│   └── popup-styles.js            # Injected style strings
├── common/
│   ├── sanitize.js                # Sanitizer supporting phrase length up to 8 words
│   ├── domain-detector.js         # Domain and expression classifier
│   ├── position.js                # Anchor positioning for multi-word phrases and PDF selections
│   └── storage.js                 # Settings persistence
└── options/
    ├── options.html
    ├── options.js
    └── options.css

tests/
├── unit/
│   ├── phrase-normalizer.test.js  # Lemmatization of verb tenses and pronoun normalization
│   ├── idiom-service.test.js      # Multi-provider idiom lookup, candidate fallback, and timeout
│   ├── sanitize.test.js           # 2-8 words sanitization and boundary cleanup
│   ├── wiktionary.test.js         # Wiktionary idiom/phrase parsing and origin extraction
│   └── context-menu.test.js       # Multi-word phrase right-click context menu handling
└── setup.js
```

**Structure Decision**: Retains existing clean architecture. Adds `phrase-normalizer.js` and `idiom-index.js` to `src/background/` to manage lemmatization and single-word related idiom suggestions without cluttering general lexical services. Extends `src/common/sanitize.js` and `src/content/content.js` to handle phrase lengths up to 8 words.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
