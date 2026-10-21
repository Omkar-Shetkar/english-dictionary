# Tasks: Google Chrome Support and Chrome Web Store Deployment

**Input**: Design documents from `/specs/003-add-chrome-support/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)  

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Associated user story (US1 through US5 from spec.md)
- Every task includes explicit file paths

---

## Phase 1: Setup (Shared Multi-Target Infrastructure)

**Purpose**: Establish browser-specific manifest templates and target directories for Chrome and Firefox.

- [ ] T001 Create Chrome Manifest V3 template with service worker in `src/manifest.chrome.json`
- [ ] T002 [P] Create Firefox Manifest V3 template with background scripts and Gecko settings in `src/manifest.firefox.json`
- [ ] T003 [P] Create directory structure for build artifacts and store assets: `dist/chrome`, `dist/firefox`, `assets/store`, `scripts`

---

## Phase 2: Foundational (Blocking Multi-Target Pipeline)

**Purpose**: Core multi-target build and packaging engine required before browser testing can begin.

**⚠️ CRITICAL**: Must complete before user story testing and packaging.

- [ ] T004 Implement multi-target build script in `scripts/build.js` compiling esbuild bundles into `dist/chrome` and `dist/firefox` with appropriate manifest templates
- [ ] T005 [P] Implement release packaging script in `scripts/package.js` to create clean distribution zip archives in `web-ext-artifacts/`
- [ ] T006 Update `package.json` scripts with multi-target commands (`build:chrome`, `build:firefox`, `package:chrome`, `package:firefox`, `package:all`, `start:chrome`) in `package.json`
- [ ] T007 Verify background script Service Worker lifecycle compatibility (synchronous top-level listener registration and async `return true`) in `src/background/background.js`

**Checkpoint**: Multi-target build and packaging pipeline operational — user story implementations can proceed.

---

## Phase 3: User Story 1 - Instant Word Lookup in Google Chrome (Priority: P1) 🎯 MVP

**Goal**: Deliver core dictionary lookup, phonetic transcription, definitions, and audio pronunciation in Google Chrome.

**Independent Test**: Run `npm run build:chrome`, load `dist/chrome` as unpacked extension in `chrome://extensions`, double-click any word on a webpage, and verify that the floating dictionary popup appears with phonetics, meanings, and plays pronunciation audio on click.

### Implementation for User Story 1

- [ ] T008 [US1] Verify content script message passing compatibility with Chrome extension runtime in `src/content/content.js`
- [ ] T009 [P] [US1] Ensure audio playback in `src/content/popup-view.js` adheres to Chrome user gesture audio autoplay policies
- [ ] T010 [US1] Verify unpacked loading and double-click lookup operation of `dist/chrome` in Google Chrome developer mode with zero runtime errors

**Checkpoint**: User Story 1 functional — MVP dictionary lookup working in Google Chrome.

---

## Phase 4: User Story 2 - Preferences and Modifier Key Configuration in Google Chrome (Priority: P2)

**Goal**: Ensure preferences (modifier key requirement, theme, multi-word selection) function and persist in Google Chrome.

**Independent Test**: Open extension options in Google Chrome, set trigger combination to "Alt + Double-click", verify standard double-click does not trigger popup, verify Alt + Double-click triggers popup, and verify theme preferences persist.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Verify options controller storage synchronization with `chrome.storage.sync` (and local fallback) in `src/options/options.js`
- [ ] T012 [US2] Verify toolbar action popup and options page rendering and responsive styling in Chrome in `src/options/options.html` and `src/options/options.css`

**Checkpoint**: User Stories 1 and 2 functional — Full feature parity in Google Chrome.

---

## Phase 5: User Story 3 - Regression-Free Firefox Compatibility (Priority: P3)

**Goal**: Guarantee existing Firefox functionality, test suites, and packaging workflows continue to operate without regressions.

**Independent Test**: Run `npm test`, run `npm run build:firefox`, and run `npm run lint` / `web-ext lint` to confirm 100% test pass rate and zero manifest warnings.

### Implementation for User Story 3

- [ ] T013 [P] [US3] Create manifest schema test suite validating both Chrome and Firefox manifests in `tests/unit/manifest.test.js`
- [ ] T014 [US3] Run complete Vitest test suite (`npm test`) to verify all existing sanitization, position, and storage tests pass
- [ ] T015 [US3] Run Firefox extension linter (`npm run lint` / `web-ext lint --source-dir dist/firefox`) to verify zero warnings or fatal errors

**Checkpoint**: User Story 3 verified — Dual-target stability confirmed with zero Firefox regressions.

---

## Phase 6: User Story 4 - Developer Workflow for Dedicated Multi-Target Packaging (Priority: P4)

**Goal**: Provide deterministic packaging commands generating clean, compliant zip archives for both store ecosystems.

**Independent Test**: Execute `npm run package:all` and verify `web-ext-artifacts/` contains valid, uncorrupted zip files for Chrome and Firefox with correct manifests at root.

### Implementation for User Story 4

- [ ] T016 [P] [US4] Add artifact sanity verification (root manifest presence, exclusion of `.DS_Store` and test files) to `scripts/package.js`
- [ ] T017 [US4] Test and verify `npm run package:chrome` and `npm run package:firefox` producing distinct release packages in `web-ext-artifacts/`

**Checkpoint**: User Story 4 functional — Distribution archives generated with a single command.

---

## Phase 7: User Story 5 - Comprehensive Chrome Web Store Deployment Guide & Assets (Priority: P5)

**Goal**: Commit production-ready store visual assets and complete developer publishing documentation in `README.md`.

**Independent Test**: Inspect `assets/store/` for required 128x128 icon, 1280x800 screenshots, and 440x280 promo banner; review `README.md` to ensure all registration, packaging, listing metadata, privacy declarations, and review steps are clearly documented.

### Implementation for User Story 5

- [ ] T018 [P] [US5] Generate ready-to-upload 128x128 store icon asset in `assets/store/store-icon-128.png`
- [ ] T019 [P] [US5] Generate ready-to-upload 1280x800 UI showcase screenshots in `assets/store/screenshot-1.png` and `assets/store/screenshot-2.png`
- [ ] T020 [P] [US5] Generate ready-to-upload 440x280 small promotional banner in `assets/store/promo-tile-440x280.png`
- [ ] T021 [US5] Add comprehensive Chrome Web Store publishing section (developer account, packaging, listing fields, privacy disclosures, review timeline) to `README.md`
- [ ] T022 [P] [US5] Add optional CI/CD release workflow template for Chrome Web Store in `README.md` appendix

**Checkpoint**: User Story 5 complete — Ready-to-upload assets and deployment guide in place.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanups, version alignment, and end-to-end verification.

- [ ] T023 [P] Synchronize extension version across `package.json`, `src/manifest.chrome.json`, and `src/manifest.firefox.json`
- [ ] T024 Perform end-to-end validation of all steps in `specs/003-add-chrome-support/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion. Delivers MVP Chrome support.
- **User Story 2 (Phase 4)**: Depends on Phase 2 & US1 completion.
- **User Story 3 (Phase 5)**: Can run in parallel with US1/US2 to verify Firefox regression-free status.
- **User Story 4 (Phase 6)**: Depends on Phase 2 & Phase 3.
- **User Story 5 (Phase 7)**: Assets and documentation can be created in parallel with implementation.
- **Polish (Phase 8)**: Depends on completion of all desired user stories.

### Parallel Opportunities

- `T001`, `T002`, `T003` can execute in parallel during Setup.
- `T004`, `T005` can be developed in parallel in `scripts/`.
- `T013` (manifest test) can be written in parallel with `T011` / `T012`.
- `T018`, `T019`, `T020`, `T022` (store graphics & CI/CD template) can run completely in parallel with code tasks.

---

## Parallel Example: Store Assets & Manifests

```bash
# Launch manifest templates in parallel:
Task: "Create Chrome Manifest V3 template with service worker in src/manifest.chrome.json"
Task: "Create Firefox Manifest V3 template with background scripts and Gecko settings in src/manifest.firefox.json"

# Launch store assets creation in parallel:
Task: "Generate ready-to-upload 128x128 store icon asset in assets/store/store-icon-128.png"
Task: "Generate ready-to-upload 1280x800 UI showcase screenshots in assets/store/screenshot-1.png and assets/store/screenshot-2.png"
Task: "Generate ready-to-upload 440x280 small promotional banner in assets/store/promo-tile-440x280.png"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational build script).
2. Execute Phase 3 (User Story 1).
3. Validate User Story 1 in Google Chrome developer mode (`chrome://extensions`).
4. **MVP achieved**: Instant dictionary lookups working smoothly in Chrome.

### Incremental Delivery

1. Setup + Foundational → Pipeline ready (`dist/chrome` and `dist/firefox`).
2. Add US1 → Core word lookup in Chrome (MVP).
3. Add US2 → Options and modifier key support in Chrome.
4. Add US3 → Firefox regression suite and lint validation.
5. Add US4 → Automated zip packaging (`package:chrome`, `package:firefox`).
6. Add US5 → Chrome Web Store assets and developer deployment guide.
7. Polish → Version synchronization and quickstart run.
