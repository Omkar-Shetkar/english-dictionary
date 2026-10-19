# Tasks: Technical, Scientific, and Domain-Specific Vocabulary Lookup

**Input**: Design documents from `/specs/002-expand-domain-terms/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)  

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3], [US4], [US5])
- File paths are specific and relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project configuration, host permissions, and storage schema updates.

- [ ] T001 Add host permissions for `https://*.wiktionary.org/*` and `https://*.wikipedia.org/*` in src/manifest.json
- [ ] T002 [P] Update storage configuration helper in src/common/storage.js to support multiWordEnabled and domainBadgesEnabled settings with schema version 2
- [ ] T003 [P] Implement unit tests for updated storage schema and defaults in tests/unit/storage.test.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data utilities, normalizers, smart routing coordinator, and background dispatcher that MUST be complete before user stories begin.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [ ] T004 [P] Update word sanitization in src/common/sanitize.js to preserve letter casing for acronyms, retain internal punctuation (A.I., e.g., P/E ratio), and support 2–4 word compound terms
- [ ] T005 [P] Implement unit tests for enhanced sanitization logic in tests/unit/sanitize.test.js
- [ ] T006 [P] Implement Wiktionary REST API client and response parser in src/background/normalizers/wiktionary.js for case-sensitive acronym extraction and domain tags
- [ ] T007 [P] Implement Wikipedia Summary REST API client and parser in src/background/normalizers/wikipedia.js for encyclopedic lead summaries and descriptions
- [ ] T008 [P] Implement domain category classifier utility in src/common/domain-detector.js mapping raw context tags to Computing, Science, Mathematics, Business, History, and General
- [ ] T009 Implement multi-provider query coordinator and smart low-latency router in src/background/dictionary-service.js with concurrent dispatch, 2.5s AbortController timeouts, and in-memory cache
- [ ] T010 Update background runtime message dispatcher in src/background/background.js to handle LOOKUP_DOMAIN_TERM actions and delegate to dictionary-service.js
- [ ] T011 [P] Implement unit tests for Wiktionary and Wikipedia response normalizers in tests/unit/wiktionary.test.js and tests/unit/wikipedia.test.js
- [ ] T012 [P] Implement unit tests for multi-provider smart routing, timeout handling, and in-memory cache in tests/unit/dictionary-service.test.js

**Checkpoint**: Foundation ready — all user story implementation phases can now proceed.

---

## Phase 3: User Story 1 - Abbreviations and Acronym Recognition (Priority: P1) 🎯 MVP

**Goal**: Double-clicking an uppercase abbreviation, initialism, or acronym (such as "AI", "API", "ROI", "DNA", "GDP", "HTTP") immediately displays its full expansion (e.g., "AI → Artificial Intelligence") followed by its domain definition, prioritizing the acronym over obscure lowercase homographs.

**Independent Test**: Double-click "AI" on any webpage; verify the popup displays "Artificial Intelligence" [Computing] as the prominent title rather than a three-toed sloth.

- [ ] T013 [US1] Implement acronym expansion header and full-title rendering in src/content/popup-view.js
- [ ] T014 [P] [US1] Add CSS styles for acronym title banner, expansion badge, and abbreviation styling in src/content/popup.css
- [ ] T015 [US1] Update double-click text extraction in src/content/content.js to preserve uppercase casing and dispatch LOOKUP_DOMAIN_TERM to background
- [ ] T016 [P] [US1] Implement unit test cases for acronym detection, case preservation, and title extraction in tests/unit/wiktionary.test.js

**Checkpoint**: User Story 1 is fully functional and delivers the core MVP acronym lookup capability.

---

## Phase 4: User Story 2 - Technical and Scientific Terms Lookup (Priority: P2)

**Goal**: Looking up specialized computing, engineering, biological, chemical, physical, and mathematical terms returns precise academic definitions tagged with domain category badges ([Computing], [Biology], [Mathematics]).

**Independent Test**: Double-click "photosynthesis", "polymorphism", or "eigenvalue"; verify definition displays with corresponding [Biology], [Computing], or [Mathematics] badge.

- [ ] T017 [US2] Implement domain badge mapping and field tag rendering logic in src/content/popup-view.js
- [ ] T018 [P] [US2] Add CSS badge styles with curated color palettes for Computing, Science, and Mathematics in src/content/popup.css
- [ ] T019 [P] [US2] Implement unit tests for domain tag classification in tests/unit/domain-detector.test.js

**Checkpoint**: User Stories 1 AND 2 are functional, delivering deep technical and scientific domain vocabulary support.

---

## Phase 5: User Story 3 - Business, Financial, and Historical Terms Lookup (Priority: P3)

**Goal**: Looking up business jargon, economic metrics, and historical eras (such as "amortization", "liquidity", "EBITDA", "Renaissance", "feudalism") renders concise contextual overviews and domain badges ([Finance], [History]) with optional canonical reference links.

**Independent Test**: Double-click "amortization" or "Renaissance"; verify finance definition or historical overview displays with [Finance] or [History] badge and optional reference link.

- [ ] T020 [US3] Implement encyclopedic summary rendering and Wikipedia canonical reference link in src/content/popup-view.js
- [ ] T021 [P] [US3] Add CSS styles for Business and History badges and encyclopedic summary text in src/content/popup.css
- [ ] T022 [P] [US3] Add unit tests for Wikipedia encyclopedic extraction and business/history domain tags in tests/unit/wikipedia.test.js

**Checkpoint**: User Stories 1, 2, and 3 provide comprehensive coverage across science, technology, business, and history.

---

## Phase 6: User Story 4 - Multi-Word Domain Term Selection (Priority: P4)

**Goal**: Highlighting a 2-to-4 word compound concept (e.g., "machine learning", "compound interest", "operating system") displays a compact floating dictionary icon near the selection; clicking it opens the definition without disrupting text copying. If a modifier key is configured and held, the popup opens immediately on mouseup.

**Independent Test**: Highlight "machine learning"; verify floating icon appears near selection without popup; click icon and verify unified compound definition renders; verify holding Alt while selecting opens popup immediately.

- [ ] T023 [US4] Implement floating dictionary trigger button component with auto-dismiss on scroll or click-outside in src/content/floating-icon.js
- [ ] T024 [P] [US4] Add CSS styles, hover state, and entrance animation for the floating dictionary trigger icon in src/content/popup.css
- [ ] T025 [US4] Implement 2-to-4 word drag-selection listener, word count validation, and floating icon positioning in src/content/content.js
- [ ] T026 [P] [US4] Implement unit tests for multi-word selection bounds and word-count validation in tests/unit/multi-word.test.js

**Checkpoint**: Multi-word compound term lookup operates seamlessly without accidental triggers during normal copying.

---

## Phase 7: User Story 5 - Disambiguation & Domain Categorization Badges (Priority: P5)

**Goal**: When a query matches both an acronym/domain term and general English lexical definitions (e.g., "RAM", "AI"), render a stacked layout with the acronym/domain meaning prominently at the top, followed by a clearly demarcated "General English Meanings" section below.

**Independent Test**: Look up "RAM"; verify top section displays "Random Access Memory" [Computing] and bottom section displays "General English Meanings" [Zoology] "A male sheep".

- [ ] T027 [US5] Implement stacked disambiguation layout separating primary domain/acronym meanings from general English meanings in src/content/popup-view.js
- [ ] T028 [P] [US5] Add CSS styles for the demarcated "General English Meanings" divider and secondary card section in src/content/popup.css
- [ ] T029 [US5] Update options page with toggles for multi-word selection and domain badges in src/options/options.html, src/options/options.js, and src/options/options.css

**Checkpoint**: Disambiguation layout and user option toggles are fully integrated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Bundling verification, test suite execution, and documentation updates.

- [ ] T030 [P] Update options page documentation and keyboard shortcut guide in src/options/options.html
- [ ] T031 Re-build extension bundles and verify build output with npm run build
- [ ] T032 Run full automated test suite npm test across all new and existing unit tests
- [ ] T033 Execute manual validation scenarios defined in specs/002-expand-domain-terms/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Stories (Phases 3–7)**: All depend on Foundational phase completion.
  - User stories can proceed sequentially (P1 → P2 → P3 → P4 → P5) or in parallel.
- **Polish (Phase 8)**: Depends on all user story phases being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories. Delivers MVP.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — Uses domain-detector utility from Phase 2.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — Uses Wikipedia normalizer from Phase 2.
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) — Adds floating-icon trigger for multi-word phrases.
- **User Story 5 (P5)**: Can start after US1–US3 — Combines domain and general meanings in stacked view.

### Parallel Opportunities

- Within Phase 1: T002 and T003 can run in parallel.
- Within Phase 2: T004, T005, T006, T007, T008, T011, and T012 can run in parallel.
- Once Phase 2 completes: US1, US2, US3, and US4 can be developed in parallel.
- All tasks marked `[P]` operate on separate files without blocking dependencies.

---

## Parallel Example: User Story 1

```bash
# Launch popup styling and test cases in parallel with content script logic:
Task: "Add CSS styles for acronym title banner, expansion badge, and abbreviation styling in src/content/popup.css"
Task: "Implement unit test cases for acronym detection, case preservation, and title extraction in tests/unit/wiktionary.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T012) — **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T013–T016)
4. **STOP and VALIDATE**: Double-click "AI" and verify "Artificial Intelligence" displays as primary title.
5. Deliver MVP.

### Incremental Delivery

1. Setup + Foundational → Core multi-provider router ready.
2. User Story 1 → Acronym expansion functional (MVP!).
3. User Story 2 → Technical and scientific domain terms and badges active.
4. User Story 3 → Business and historical encyclopedic concepts active.
5. User Story 4 → 2–4 word multi-word floating icon trigger active.
6. User Story 5 → Stacked disambiguation view and settings toggles active.
7. Polish → Bundles built, all unit tests green, quickstart validated.
