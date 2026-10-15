# Feature Specification: English Dictionary Firefox Addon

**Feature Branch**: `001-dictionary-word-lookup`  
**Created**: 2026-10-16  
**Status**: Draft  
**Input**: User description: "We want to build an english dictionary firefox addon. It should be simple and intuitive in UI. When user double-clicks a word, a pop up appears near the word with the pronounciation,meaning, and usage of the word. User can have option to double-click in combination with a key."

## Clarifications

### Session 2026-10-16

- Q: Which dictionary data service should the Firefox addon use for word definitions, phonetics, and audio pronunciation? → A: Free Dictionary API (`api.dictionaryapi.dev`) — Free and open, requiring no user account or API key, providing definitions, phonetic transcription, audio pronunciation files, and usage examples.
- Q: What should be the default trigger behavior upon initial installation of the addon? → A: Direct Double-click by default (`"none"`) — The popup opens immediately on double-clicking a word without requiring a key, while users can configure an optional modifier key (Alt, Ctrl, or Shift) in the extension settings.
- Q: Should the addon store a history of looked-up words for user review, or keep lookups strictly ephemeral? → A: Strictly ephemeral in v1 — Lookups are displayed on-demand and dismissed without storing any search history or user activity locally or remotely.

## User Scenarios & Testing *(mandatory)*


### User Story 1 - Quick Word Lookup via Double-Click (Priority: P1)

As a web reader browsing articles in Firefox, I want to double-click an unfamiliar English word and immediately see a clean popup near the word displaying its pronunciation, definition, and usage examples, so that I can understand the content without switching tabs or leaving the page.

**Why this priority**: This represents the core value proposition and primary user journey of the addon. Without this interaction, the addon provides no utility.

**Independent Test**: Can be tested on any readable web page by double-clicking an English word (e.g., "ephemeral") and verifying that an anchored popup card appears near the word showing phonetics, meaning, and example usage.

**Acceptance Scenarios**:

1. **Given** a user is reading a web page in Firefox with the addon active, **When** the user double-clicks an English word, **Then** a floating popup card appears anchored adjacent to the selected word with the word heading, phonetic transcription, part(s) of speech, definition(s), and an example sentence.
2. **Given** a dictionary popup card is displayed, **When** the user clicks anywhere outside the popup card, presses the Escape key, or scrolls the document, **Then** the popup card dismisses smoothly without disrupting the host web page.

---

### User Story 2 - Configurable Trigger Key Combination (Priority: P2)

As a user who frequently selects text to copy or edit, I want the option to require a modifier key (such as Alt, Ctrl, or Shift) in combination with a double-click to trigger the dictionary popup, so that normal double-click text selection is not interrupted when I do not intend to look up words.

**Why this priority**: Prevents accidental dictionary popups during routine reading and copying workflows, which is essential for user retention and non-intrusive operation.

**Independent Test**: Can be tested by opening addon options, setting the trigger combination to "Alt + Double-click", verifying that plain double-click only selects text without opening the popup, and verifying that holding Alt while double-clicking triggers the popup.

**Acceptance Scenarios**:

1. **Given** the user selects "Alt + Double-click" in the addon settings, **When** the user double-clicks a word while holding the Alt key, **Then** the dictionary popup appears near the word.
2. **Given** the user selects "Alt + Double-click" in the addon settings, **When** the user double-clicks a word without holding the Alt key, **Then** standard browser text selection occurs and no dictionary popup appears.
3. **Given** the user selects "None (Double-click only)" in the addon settings, **When** the user double-clicks a word, **Then** the dictionary popup appears immediately.

---

### User Story 3 - Audio Pronunciation Playback (Priority: P3)

As a language learner, I want to listen to how the selected word is pronounced aloud by clicking a speaker button in the popup, so that I can learn proper spoken English pronunciation alongside definitions.

**Why this priority**: Enhances comprehension and auditory learning beyond written phonetic text, providing a complete dictionary experience.

**Independent Test**: Can be tested by looking up a word with available audio, clicking the speaker icon in the popup, and confirming clear audio output of the spoken word.

**Acceptance Scenarios**:

1. **Given** the dictionary popup is visible for a word with available audio, **When** the user clicks the audio pronunciation button, **Then** the addon plays the spoken audio pronunciation of the word.
2. **Given** a word where no audio pronunciation file is available, **When** the popup renders, **Then** the audio button is gracefully hidden or disabled while the written phonetic pronunciation remains visible.

---

### User Story 4 - Resilient Error & Empty State Feedback (Priority: P4)

As a user looking up rare words, misspelled terms, or reading while offline, I want clear and non-obtrusive feedback when a definition is not found or the network is unavailable, so that I understand why no definition appeared.

**Why this priority**: Ensures graceful degradation and prevents user confusion when lookups cannot be resolved.

**Independent Test**: Can be tested by double-clicking non-words or disconnecting internet access, verifying a compact, polite error message is displayed in the popup with an option to close.

**Acceptance Scenarios**:

1. **Given** the user triggers lookup on a word that does not exist in the dictionary, **When** the search completes, **Then** the popup displays a polite message indicating no definitions were found, suggesting verification of spelling.
2. **Given** the device has lost internet connectivity, **When** the user triggers a lookup, **Then** the popup informs the user of the network disconnection rather than hanging indefinitely.

---

### Edge Cases

- **Punctuation and Whitespace**: When a user double-clicks a word adjacent to quotation marks, parentheses, commas, or periods, the addon must sanitize and trim boundary punctuation to look up only the clean word lemma.
- **Numbers, Symbols, and Multi-word Selections**: Double-clicking numbers, code tokens, or non-alphabetical strings must either be ignored or report an informative message without crashing.
- **Page Boundary / Viewport Overflow**: When a double-clicked word is near the edge of the viewport (top, bottom, or right edge), the popup must automatically adjust its positioning so it remains fully visible within the browser window.
- **Overlapping Popups**: Double-clicking a new word while an existing popup is open must immediately replace the old popup with the new lookup result rather than stacking multiple popups.
- **Complex Web Contexts**: The popup must render cleanly inside standard web content without interfering with page styles, forms, or contenteditable fields.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect user double-click events on text words within web page content.
- **FR-002**: System MUST extract and sanitize the selected word, stripping surrounding whitespace and punctuation characters.
- **FR-003**: System MUST display a floating dictionary popup anchored in close proximity to the selected word within the viewport.
- **FR-004**: System MUST display phonetic pronunciation text (e.g., IPA notation) for the queried word when available.
- **FR-005**: System MUST provide an interactive audio control to play spoken pronunciation if an audio recording is available for the word.
- **FR-006**: System MUST display word part of speech (noun, verb, adjective, adverb, etc.) and primary definitions in an easy-to-read hierarchy.
- **FR-007**: System MUST display at least one usage example sentence for definitions where usage data is available.
- **FR-008**: System MUST default to direct double-click (no modifier key required) upon initial installation, while providing user-configurable settings to select an optional modifier key requirement:
  - Direct double-click (default: no modifier key required)
  - Alt + Double-click
  - Ctrl + Double-click
  - Shift + Double-click
- **FR-009**: System MUST persist user trigger preferences across browser sessions.
- **FR-010**: System MUST automatically dismiss the active popup when the user clicks outside the popup, presses the Escape key, or scrolls the viewport.
- **FR-011**: System MUST display an intuitive loading state within the popup while retrieving word details.
- **FR-012**: System MUST display concise, helpful feedback when a word is not found or when a network error occurs.
- **FR-013**: System MUST ensure popup elements do not clash with or inherit destructive CSS styles from the host web page.
- **FR-014**: System MUST query the Free Dictionary API (`api.dictionaryapi.dev`) to retrieve English definitions, phonetics, audio pronunciation files, and usage examples without requiring user API authentication.
- **FR-015**: System MUST treat lookups as strictly ephemeral; the addon MUST NOT record, persist, or transmit user lookup history or search logs, keeping operation privacy-focused and lightweight.

### Key Entities *(include if feature involves data)*

- **WordLookupRequest**: Represents a user's lookup action, containing raw selected text, cleaned search term, viewport coordinates of the selection bounding box, and active modifier key state.
- **DictionaryEntry**: The retrieved dictionary data structure containing:
  - `word`: The canonical word string.
  - `phonetic`: Phonetic notation string (IPA).
  - `audioUrl`: Optional URL pointing to the audio pronunciation file.
  - `meanings`: A list of meanings grouped by part of speech, each containing definitions, usage examples, and optional synonyms/antonyms.
- **TriggerConfiguration**: User preferences governing lookup behavior:
  - `modifierKey`: The required modifier key (`"none"`, `"alt"`, `"ctrl"`, `"shift"`), defaulting to `"none"`.
  - `enabled`: Boolean toggle to enable or disable the lookup feature globally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dictionary popup appears and begins rendering content within 300 milliseconds of a double-click on standard broadband connections.
- **SC-002**: 95% of standard English vocabulary words display accurate definitions, phonetics, and usage examples.
- **SC-003**: 100% of popup dismiss actions (clicking outside, pressing Escape, scrolling) close the popup without requiring page reload or manual element inspection.
- **SC-004**: Zero visual clipping or overflow: 100% of popups remain completely visible within the current browser viewport boundaries regardless of word position.
- **SC-005**: Zero interference with host page text copying when modifier key mode is activated.
- **SC-006**: User can change trigger key settings in under 15 seconds through an intuitive options interface.

## Assumptions

- **Dictionary Data Source**: The addon uses the public Free Dictionary API (`api.dictionaryapi.dev`) as its primary data provider for definitions, phonetics, audio, and usage examples without requiring API keys or user accounts.
- **Host Permissions & Security**: The addon operates within standard Firefox WebExtensions permission models, requesting host permissions required to inspect selected text and display popups.
- **Language Scope**: Initial version is scoped specifically to the English language dictionary.
- **Browser Compatibility**: The addon targets modern Firefox desktop versions supporting standard WebExtension APIs.
- **Offline Behavior**: When disconnected from the internet, the addon displays a graceful offline notification; full offline dictionary database storage is considered out of scope for the initial lightweight release.
- **Privacy & Data Persistence**: Lookups are strictly ephemeral in v1; no history, search logs, or telemetry are stored on the user's machine or transmitted to external tracking servers.
