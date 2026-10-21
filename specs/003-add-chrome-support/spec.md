# Feature Specification: Google Chrome Support and Chrome Web Store Deployment

**Feature Branch**: `003-add-chrome-support`  
**Created**: 2026-10-21  
**Status**: Draft  
**Input**: User description: "Currently, this extension is supported only for Firefox. We want to extend support to Google chrome as well. Also, update documentation to help the developer to deploy the extension in Google chrome extension store."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Word Lookup in Google Chrome (Priority: P1)

As a web reader browsing articles in Google Chrome, I want to double-click an unfamiliar English word and immediately see a clean popup card anchored near the word showing its pronunciation, definitions, and usage examples, so that I can understand the content without leaving my current webpage or switching browsers.

**Why this priority**: Extending full dictionary lookup functionality to Google Chrome users is the primary objective of this feature. Without core dictionary interaction working seamlessly in Chrome, the extension cannot serve Chrome users.

**Independent Test**: Load the extension in Google Chrome, navigate to any webpage, double-click an English word (e.g., "resilient"), and verify that a floating dictionary popup appears adjacent to the selected word displaying phonetics, part of speech, definitions, and usage examples.

**Acceptance Scenarios**:

1. **Given** a user is reading a webpage in Google Chrome with the extension active, **When** the user double-clicks an English word, **Then** a floating popup card appears anchored near the selected word displaying phonetic spelling, part(s) of speech, definitions, and usage examples.
2. **Given** the dictionary popup is visible on a webpage in Google Chrome, **When** the user clicks outside the popup card, presses the Escape key, or scrolls the document, **Then** the popup dismisses smoothly without disrupting the host webpage.
3. **Given** the dictionary popup is open for a word with available audio pronunciation in Google Chrome, **When** the user clicks the audio pronunciation button, **Then** the spoken pronunciation plays clearly without errors.

---

### User Story 2 - Preferences and Modifier Key Configuration in Google Chrome (Priority: P2)

As a Google Chrome user who frequently selects text to copy, edit, or highlight, I want the ability to require a modifier key (such as Alt, Ctrl/Cmd, or Shift) in combination with a double-click to trigger the dictionary popup, and configure appearance preferences (theme, multi-word selection), so that ordinary double-click text selection remains uninterrupted when I do not intend to look up words.

**Why this priority**: Ensures full feature parity between Chrome and Firefox for power users, preventing accidental dictionary popups during routine reading and text editing workflows.

**Independent Test**: Open extension options in Google Chrome, set trigger combination to "Alt + Double-click", verify that a plain double-click only selects text without opening the popup, and verify that holding Alt while double-clicking opens the popup.

**Acceptance Scenarios**:

1. **Given** the user selects "Alt + Double-click" in the extension options on Google Chrome, **When** the user double-clicks a word while holding the Alt key, **Then** the dictionary popup appears near the word.
2. **Given** the user selects "Alt + Double-click" in the extension options on Google Chrome, **When** the user double-clicks a word without holding the Alt key, **Then** standard browser text selection occurs and no dictionary popup appears.
3. **Given** the user changes appearance theme (Light, Dark, or Auto) or multi-word selection settings in Chrome, **When** triggering subsequent lookups, **Then** the popup renders using the updated preferences and persists across browser restarts.

---

### User Story 3 - Regression-Free Firefox Compatibility (Priority: P3)

As an existing Mozilla Firefox user, I want the extension to continue functioning flawlessly with identical behavior and performance, so that expanding support to Google Chrome does not introduce bugs, regressions, or degraded capabilities on Firefox.

**Why this priority**: Preserving existing functionality for Firefox users is vital to maintaining trust and product quality. Dual-browser support must not compromise the original platform.

**Independent Test**: Run existing automated test suites and verify manual testing on Mozilla Firefox to confirm double-click lookup, audio pronunciation, options management, and build packaging continue to work without error.

**Acceptance Scenarios**:

1. **Given** the extension codebase updated with Chrome support, **When** running automated unit and integration test suites, **Then** 100% of existing tests pass without regressions.
2. **Given** the extension loaded in Mozilla Firefox, **When** performing word lookups, playing pronunciation audio, and changing options, **Then** all features behave identically to previous Firefox releases.
3. **Given** the developer running Firefox build and package scripts, **When** the build command executes, **Then** a valid Firefox addon archive is produced that passes `web-ext lint` with zero errors.

---

### User Story 4 - Developer Workflow for Local Chrome Development & Packaging (Priority: P4)

As an extension developer, I want clear commands and build configurations to run and package the extension for Google Chrome alongside Firefox, so that I can develop, debug, and produce store-ready distribution archives for both browsers with minimal effort.

**Why this priority**: Developers need a frictionless local workflow to verify changes in Chrome and generate compliant distribution packages for deployment.

**Independent Test**: Execute the local Chrome build command, verify the output artifact or directory structure, and load it into Google Chrome via `chrome://extensions` in developer mode without manifest warnings.

**Acceptance Scenarios**:

1. **Given** a developer in the project workspace, **When** executing the Chrome build script, **Then** the project bundles all scripts and creates a compliant distribution artifact ready for Chrome loading and packaging.
2. **Given** a developer loading the unpacked extension in `chrome://extensions`, **When** Developer Mode is active and "Load unpacked" is selected, **Then** the extension loads without manifest schema warnings or runtime initialization errors.
3. **Given** a developer executing packaging commands, **When** the package script completes, **Then** distinct, properly structured zip archives are produced for Chrome and Firefox store submissions.

---

### User Story 5 - Comprehensive Chrome Web Store Deployment Guide (Priority: P5)

As an extension developer or maintainer, I want a complete, step-by-step deployment guide in the project documentation detailing how to register for a Chrome Developer account, prepare store listings, package the extension, disclose privacy practices, and submit the extension to the Google Chrome Web Store, so that I can publish updates reliably and pass Google store review without delays.

**Why this priority**: Fulfills the user requirement for developer documentation, eliminating guesswork around store requirements, asset specifications, and compliance policies.

**Independent Test**: Review the deployment guide in the project documentation and verify that every phase—from initial developer account registration to store asset requirements, permission justifications, package upload, and review timelines—is clearly described with actionable steps.

**Acceptance Scenarios**:

1. **Given** a developer preparing to deploy the extension to the Chrome Web Store, **When** reviewing the project documentation, **Then** the guide clearly outlines developer account registration prerequisites, including the one-time registration fee and Google Developer Dashboard navigation.
2. **Given** a developer preparing store listing materials, **When** consulting the deployment guide, **Then** exact specifications for required graphic assets (store icon, screenshots, promotional tiles), category selections, and store descriptions are provided.
3. **Given** a developer completing the Chrome Web Store privacy tab, **When** following the guide, **Then** precise explanations and justifications for requested permissions (storage, external API hosts) and data privacy declarations (single purpose, zero user data collection) are provided.
4. **Given** a developer submitting an updated version, **When** following the guide, **Then** version numbering rules, release packaging commands, and post-submission review expectations are clearly documented.

---

### Edge Cases

- **Message Passing Protocol**: Communication between content scripts and background services must accommodate differing browser runtime behaviors without dropped messages or unresolved promises.
- **Background Service Lifecycle**: In Google Chrome, background tasks run under a service worker model that terminates when idle; background event handlers and message dispatchers must initialize reliably on demand without state corruption.
- **Manifest Schema Discrepancies**: Chrome rejects certain Firefox-specific manifest keys (such as `browser_specific_settings.gecko` and `background.scripts`), while Firefox requires specific settings for addon signing; the build/packaging mechanism must ensure both browsers receive valid manifests.
- **Cross-Origin API Requests**: Fetching definitions, phonetics, and audio from external dictionary services must comply with host permission policies across both browsers without triggering CORS blocks.
- **Audio Autoplay Policies**: Chrome enforces strict user gesture policies before allowing audio playback; pronunciation audio must only trigger directly upon user interaction (such as clicking the speaker icon).
- **Viewport Boundary and Display Scaling**: Floating popup repositioning logic must accurately calculate viewport coordinates on Chrome across diverse display zoom levels and operating systems.
- **Style Isolation**: The dictionary popup must remain fully encapsulated within a Shadow DOM root to ensure complete visual isolation from any host webpage CSS on Chrome.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run seamlessly on modern stable versions of Google Chrome (desktop) and compatible Chromium browsers.
- **FR-002**: System MUST detect user double-click events on text words within web pages in Google Chrome and display a floating dictionary popup adjacent to the selected word.
- **FR-003**: System MUST display phonetic pronunciation notation, word part(s) of speech, primary definition(s), and usage examples within the popup on Google Chrome.
- **FR-004**: System MUST provide an interactive audio control to play spoken word pronunciation in Google Chrome when audio recordings are available.
- **FR-005**: System MUST support configurable trigger preferences in Google Chrome:
  - Direct Double-click (default: no modifier key required)
  - Alt + Double-click
  - Ctrl / Cmd + Double-click
  - Shift + Double-click
- **FR-006**: System MUST persist user preferences across browser sessions using browser storage in Google Chrome.
- **FR-007**: System MUST provide an options page accessible via the extension toolbar action and settings menu in Google Chrome.
- **FR-008**: System MUST dismiss the dictionary popup on Google Chrome when the user clicks outside the popup card, presses the Escape key, or scrolls the viewport.
- **FR-009**: System MUST support light mode, dark mode, and automatic system theme detection within the popup on Google Chrome.
- **FR-010**: System MUST maintain strict privacy and ephemeral operation on Google Chrome: zero search history, zero telemetry, and zero user data collection.
- **FR-011**: System MUST maintain full backward compatibility and zero regressions for Mozilla Firefox desktop.
- **FR-012**: System MUST provide a build command that generates clean, review-ready distribution artifacts for Google Chrome (Manifest V3 compliant).
- **FR-013**: System MUST provide a build/test command that validates extension packages against store linting and manifest guidelines.
- **FR-014**: Project documentation MUST provide step-by-step instructions for loading and testing the extension locally in Google Chrome Developer Mode.
- **FR-015**: Project documentation MUST provide a comprehensive Chrome Web Store deployment guide detailing:
  - Developer account creation and dashboard access
  - Packaging the extension for Chrome Web Store upload
  - Listing metadata requirements (title, summary, descriptions, categories)
  - Graphic asset guidelines and dimensions (128x128 store icon, 1280x800 screenshots, promotional tiles)
  - Privacy practice declarations and permissions justification (storage, dictionary API hosts)
  - Submission, review process, and update publishing workflows

### Key Entities *(include if feature involves data)*

- **ExtensionPackage**: The packaged distribution archive (.zip) containing all compiled scripts, styles, icons, and browser-compliant `manifest.json` formatted to pass store review for the respective target browser (Chrome or Firefox).
- **StoreListingMetadata**: Complete publication metadata for the Chrome Web Store, including extension name, single-purpose summary, detailed description, categorized tags, support links, privacy policy link, and required graphic assets.
- **BrowserTarget**: The designated browser environment (`chrome` or `firefox`), governing manifest schema requirements (e.g., service worker vs background scripts) and platform-specific packaging configurations.
- **TriggerConfiguration**: User preferences (modifier key, theme, multi-word selection, domain term badges) synchronized and persisted via browser storage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of dictionary capabilities (word lookup, phonetic transcription, definitions, usage examples, audio pronunciation, theme selection, modifier key triggers) function identically on Google Chrome and Mozilla Firefox.
- **SC-002**: Zero manifest warnings or schema errors when loading the unpacked extension in Google Chrome developer mode (`chrome://extensions`).
- **SC-003**: 100% of existing automated test suites pass with zero regressions across both platforms.
- **SC-004**: Developer can build and package the production Chrome extension in under 15 seconds using a single command line invocation.
- **SC-005**: An extension developer with no prior Chrome Web Store publishing experience can follow the deployment guide to prepare a submission-ready package, complete privacy disclosures, and submit the listing in under 30 minutes.
- **SC-006**: Generated distribution packages for both Chrome and Firefox pass respective store validation criteria with zero fatal errors.

## Assumptions

- **Target Browser Scope**: Google Chrome desktop (modern stable releases, Manifest V3) and compatible Chromium-based browsers, alongside existing support for Mozilla Firefox 112+ desktop.
- **Dual-Target Packaging Strategy**: The build system will accommodate differences between browser manifest formats (e.g., Chrome service worker vs Firefox background scripts/gecko settings) by producing dedicated, store-ready build outputs or a validated unified structure.
- **Deployment Model**: Documentation focuses on manual publication via the Google Chrome Web Store Developer Dashboard (matching the existing Firefox AMO guide in `README.md`). Automated CI/CD publishing via API can be added in a future enhancement.
- **Developer Account**: The developer possesses or will create a Google Chrome Web Store Developer account (requiring a standard one-time $5 USD registration fee paid to Google).
- **Privacy Disclosures**: Because the extension is strictly ephemeral, collects no personal data, and performs lookups solely on user double-click, privacy disclosures on the Chrome Web Store are straightforward with zero tracking declarations.
- **Dictionary Data Service**: The extension continues to utilize the public Free Dictionary API (`api.dictionaryapi.dev`) and supplementary open sources without requiring user API authentication on both Chrome and Firefox.
