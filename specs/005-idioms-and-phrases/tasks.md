# Tasks: Idioms and Phrasal Expressions Lookup

**Input**: Design documents from `/specs/005-idioms-and-phrases/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3], [US4], [US5])
- File paths are specific and relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Expand phrase boundary thresholds and text sanitization limits to support longer multi-word expressions.

- [ ] T001 Expand phrase length thresholds in src/common/sanitize.js (increase MAX_PHRASE_WORDS to 8 and MAX_PHRASE_LENGTH to 180)
- [ ] T002 [P] Implement unit tests for 2-8 word sanitization, boundary cleaning, and punctuation trimming in tests/unit/sanitize.test.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core phrase lemmatizer, keyword-to-idiom index, response normalizers, and background service routing that MUST be complete before user stories begin.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [ ] T003 [P] Implement verb lemmatizer and pronoun normalizer in src/background/phrase-normalizer.js to generate candidate queries for inflected forms and pronouns
- [ ] T004 [P] Implement unit tests for verb lemmatization (past tense, participles, gerunds) and pronoun mapping in tests/unit/phrase-normalizer.test.js
- [ ] T005 [P] Implement high-frequency keyword-to-idiom reference index in src/background/idiom-index.js for related phrases discovery
- [ ] T006 [P] Update Wiktionary REST normalizer in src/background/normalizers/wiktionary.js to parse Phrase, Idiom, Proverb, Verb, etymology/origin, and assign expression badges
- [ ] T007 [P] Implement unit tests for Wiktionary idiom parsing, proverb extraction, and etymology formatting in tests/unit/wiktionary.test.js
- [ ] T008 Update multi-provider coordinator in src/background/dictionary-service.js to dispatch phrase queries with candidate fallbacks and attach related idioms
- [ ] T009 [P] Implement unit tests for multi-provider idiom lookup, candidate fallback routing, and error handling in tests/unit/dictionary-service.test.js

**Checkpoint**: Foundation ready — all user story implementation phases can now proceed.

---

## Phase 3: User Story 1 - Multi-Word Idioms and Figurative Sayings Lookup (Priority: P1) 🎯 MVP

**Goal**: Selecting a 2 to 8 word idiom (e.g., "bite the bullet", "break the ice", "piece of cake") opens a popup card with an `[Idiom]` or `[Proverb]` badge, figurative definition, example sentence, and origin note.

**Independent Test**: Highlight "bite the bullet" or "break the ice" on any webpage; verify the popup displays an `[Idiom]` badge, figurative definition, and example sentence.

- [ ] T010 [US1] Update src/content/popup-view.js to render expression badges ([Idiom], [Proverb]), figurative definitions, example sentences, and origin/etymology section
- [ ] T011 [P] [US1] Add CSS styles for [Idiom] and [Proverb] badges, origin cards, and example blockquotes in src/content/popup.css and src/content/popup-styles.js
- [ ] T012 [US1] Update multi-word selection listener in src/content/content.js to support 2 to 8 word phrases and anchor the floating icon or popup properly
- [ ] T013 [P] [US1] Implement unit tests for 2 to 8 word phrase selection handling and floating icon trigger bounds in tests/unit/multi-word.test.js

**Checkpoint**: User Story 1 is fully functional and delivers the core MVP idiom lookup capability.

---

## Phase 4: User Story 2 - Phrasal and Prepositional Verbs Lookup (Priority: P2)

**Goal**: Highlighting a phrasal verb (e.g., "look forward to", "give up", "run out of") displays a `[Phrasal Verb]` badge with transitivity and separability notes and contextual definitions.

**Independent Test**: Highlight "look forward to" or "give up"; verify the popup displays a `[Phrasal Verb]` badge with meaning, examples, and grammatical notes.

- [ ] T014 [US2] Update Free Dictionary API normalizer and Wiktionary normalizer in src/background/dictionary-service.js to extract phrasal verb definitions and grammatical usage flags (transitivity, separability)
- [ ] T015 [US2] Implement [Phrasal Verb] badge rendering and grammatical usage notes display in src/content/popup-view.js
- [ ] T016 [P] [US2] Add CSS styles for [Phrasal Verb] badge and grammatical attribute tags in src/content/popup.css and src/content/popup-styles.js
- [ ] T017 [P] [US2] Implement unit tests for phrasal verb detection and grammatical parsing in tests/unit/dictionary-service.test.js

**Checkpoint**: User Stories 1 and 2 are functional, providing comprehensive multi-word idiom and phrasal verb support.

---

## Phase 5: User Story 3 - Inflected Forms, Tenses, and Pronoun Variations (Priority: P3)

**Goal**: Conjugated idioms ("bit the bullet", "spilled the beans") and personalized pronouns ("pulling his leg", "lost their cool") resolve automatically to canonical headwords ("bite the bullet", "pull someone's leg").

**Independent Test**: Highlight "bit the bullet" or "pulling his leg"; verify popup resolves to "bite the bullet" or "pull someone's leg" and presents full definitions.

- [ ] T018 [US3] Integrate phrase-normalizer.js into handleMultiWordLookup in src/background/dictionary-service.js to iteratively evaluate candidate queries against Wiktionary and Free Dictionary
- [ ] T019 [US3] Update popup header in src/content/popup-view.js to display the canonical headword alongside the matched surface expression
- [ ] T020 [P] [US3] Implement unit and integration tests verifying end-to-end resolution of conjugated idioms and pronoun variants in tests/unit/dictionary-service.test.js

**Checkpoint**: User Stories 1, 2, and 3 are functional, ensuring idioms in authentic prose match regardless of tense or pronoun.

---

## Phase 6: User Story 4 - Discovering Related Idioms from Single-Word Lookups (Priority: P4)

**Goal**: Looking up a single word (e.g., "weather", "ice") displays a clickable "Related Idioms & Phrases" section at the bottom of the card that transitions to that idiom upon click.

**Independent Test**: Double-click "weather"; verify "Related Idioms & Phrases" section displays "under the weather"; click the chip and verify the card transitions to "under the weather".

- [ ] T021 [US4] Integrate idiom-index.js into single-word lookups in src/background/dictionary-service.js to attach matching relatedIdioms
- [ ] T022 [US4] Implement collapsible Related Idioms & Phrases section with interactive chips and click handlers in src/content/popup-view.js
- [ ] T023 [P] [US4] Add CSS styles for related idioms section, chips, and hover transitions in src/content/popup.css and src/content/popup-styles.js
- [ ] T024 [US4] Wire related idiom click events in src/content/content.js to dispatch lookup for the clicked phrase without closing the popup
- [ ] T025 [P] [US4] Implement unit tests for related idiom suggestions and chip click event propagation in tests/unit/dictionary-service.test.js

**Checkpoint**: Single-word lookups seamlessly connect to idiom discovery.

---

## Phase 7: User Story 5 - Right-Click Context Menu Lookup for Selected Phrases (Priority: P5)

**Goal**: Right-click context menu "Look up in Simple English Dictionary" works for phrases up to 8 words across webpages and PDF documents.

**Independent Test**: Select "actions speak louder than words" in a webpage or PDF document, right-click, select "Look up in Simple English Dictionary", and confirm the popup card opens with the idiom definition.

- [ ] T026 [US5] Update context menu listener and text truncation in src/background/background.js to support phrases up to 8 words
- [ ] T027 [US5] Update TRIGGER_SELECTION_LOOKUP handler in src/content/content.js to process up to 8 words and invoke idiom lookup
- [ ] T028 [P] [US5] Implement unit tests for context menu multi-word lookup trigger in tests/unit/context-menu.test.js

**Checkpoint**: All user stories (US1-US5) are fully supported.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, dual-meaning layout, not-found fallbacks, and complete test suite verification.

- [ ] T029 Implement dual-meaning layout: emphasize figurative definition and render secondary literal definitions in src/content/popup-view.js
- [ ] T030 Implement informative "Phrase not found" card with constituent word suggestions when no idiom matches in src/content/popup-view.js
- [ ] T031 Run full regression test suite (npm test) and verify Chrome and Firefox builds (npm run build)

---

## Dependencies & Execution Flow

```text
Phase 1: Setup (T001-T002)
   ↓
Phase 2: Foundational (T003-T009)
   ↓
Phase 3: US1 - Multi-Word Idioms (T010-T013) 🎯 MVP
   ↓
Phase 4: US2 - Phrasal Verbs (T014-T017)
   ↓
Phase 5: US3 - Inflections & Pronouns (T018-T020)
   ↓
Phase 6: US4 - Related Idioms on Single Words (T021-T025)
   ↓
Phase 7: US5 - Context Menu Phrase Lookup (T026-T028)
   ↓
Final Phase: Polish & Validation (T029-T031)
```

## Parallel Execution Opportunities

- **Phase 1**: T002 can run in parallel with T001.
- **Phase 2**: T003, T005, T006 can run in parallel; T004, T007, T009 can run in parallel once respective components are drafted.
- **Phase 3**: T011 and T013 can run in parallel while T010 and T012 are implemented.
- **Phase 4**: T016 and T017 can run in parallel.
- **Phase 5**: T020 can run in parallel once T018-T019 are implemented.
- **Phase 6**: T023 and T025 can run in parallel.
- **Phase 7**: T028 can run in parallel with T026-T027.
