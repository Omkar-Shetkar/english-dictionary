# Feature Specification: Dictionary Lookup Support for PDF Documents in Browser

**Feature Branch**: `004-pdf-dictionary-support`  
**Created**: 2026-10-24  
**Status**: Draft  
**Input**: User description: "Support dictionary on pdf documents opened in browser as well."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Word Lookup in Web-Hosted PDF Documents (Priority: P1)

As a reader studying research papers, manuals, and online publications in PDF format within my browser, I want to double-click (or use my configured trigger key with a double-click on) any unfamiliar word in the PDF and immediately view its definition, pronunciation, and examples in a floating popup card, so that I can understand the document without disrupting my reading flow or switching tabs.

**Why this priority**: Online PDFs represent a substantial portion of informational and academic reading on the web. Extending core dictionary lookups to PDF viewing is the primary goal of this feature.

**Independent Test**: Open any online PDF document in a browser tab, double-click an unfamiliar English word (e.g., "empirical"), and verify that a floating dictionary popup card appears adjacent to the selected word displaying phonetic spelling, part of speech, definitions, and usage examples.

**Acceptance Scenarios**:

1. **Given** a user is viewing a web-hosted PDF document in the browser with the extension enabled, **When** the user double-clicks an English word, **Then** a floating popup card appears anchored near the selected word displaying phonetic spelling, part(s) of speech, definitions, and usage examples.
2. **Given** the dictionary popup is visible over a PDF document, **When** the user clicks outside the popup card, presses the Escape key, or scrolls the document, **Then** the popup smoothly dismisses without affecting the PDF document view.
3. **Given** the dictionary popup is open for a word with available audio pronunciation in a PDF document, **When** the user activates the audio pronunciation button, **Then** the spoken pronunciation plays clearly without errors.

---

### User Story 2 - Word Lookup in Local PDF Documents (Priority: P2)

As a user opening local PDF documents stored on my computer in the browser, I want to look up words using the same interaction triggers available on regular web pages, with clear in-browser instructions if local file permissions need to be enabled, so that my reading experience is seamless regardless of whether the PDF is online or offline.

**Why this priority**: Users frequently open local PDF textbooks, ebooks, and reference guides in browser tabs. Supporting local files ensures a consistent user experience across document sources.

**Independent Test**: Open a local PDF file from disk in a browser window, double-click a word, and verify that definition lookups function as expected. If local file access is restricted by the browser, verify that clear and actionable guidance is displayed explaining how to allow local file access.

**Acceptance Scenarios**:

1. **Given** a user opens a local PDF file in the browser with local file permissions enabled, **When** the user double-clicks any word, **Then** the dictionary card displays definitions and pronunciation matching online webpage lookups.
2. **Given** a user opens a local PDF file in a browser where local file access permissions have not yet been granted, **When** the user attempts a lookup or accesses extension preferences, **Then** the system provides clear, step-by-step instructions on how to enable file access permissions in the browser settings.

---

### User Story 3 - Multi-Word Terms and Phrases in PDF Documents (Priority: P3)

As a reader encountering multi-word domain terminology, idioms, or compound expressions in a PDF document (2 to 4 words), I want to select the phrase and trigger a lookup (via the floating action indicator or configured modifier key), so that I can understand composite terminology within its technical or literary context.

**Why this priority**: PDF documents frequently contain complex compound phrases, domain terms, and specialized idioms that require multi-word lookup rather than single-word definitions.

**Independent Test**: Highlight a 2-to-4 word phrase (e.g., "machine learning" or "ad hoc") in a browser-rendered PDF document, verify the quick lookup icon appears or modifier-selection triggers lookup, and confirm the dictionary card shows definitions and context for the compound term.

**Acceptance Scenarios**:

1. **Given** the user has multi-word lookup enabled in preferences, **When** the user selects a 2-to-4 word phrase in a PDF document, **Then** a floating lookup icon appears near the selection, which opens the dictionary card upon activation.
2. **Given** the user has configured a modifier key (e.g., Alt or Shift), **When** the user selects a 2-to-4 word phrase while holding the modifier key, **Then** the dictionary card opens immediately for the selected phrase.

---

### User Story 4 - Context Menu and Viewer Fallback Lookup (Priority: P4)

As a user reading a PDF document where native double-click gestures might conflict with embedded PDF viewer controls (such as built-in text selection bars or zoom controls), I want a right-click context menu option to "Look up in Simple English Dictionary", so that I always have a dependable, non-conflicting method to look up words in any PDF viewer environment.

**Why this priority**: Browser PDF viewers sometimes have their own selection overlays or custom event handling. Providing a context menu action guarantees that users can look up text even if double-click events are captured by native viewer controls.

**Independent Test**: Select a word in a PDF document, open the context menu (right-click), select "Look up in Simple English Dictionary", and verify that the dictionary card opens with definitions for the selected word.

**Acceptance Scenarios**:

1. **Given** a user has selected a word or phrase in a PDF document, **When** the user right-clicks and chooses the dictionary lookup option from the browser context menu, **Then** the dictionary popup appears with the relevant lexical entry.
2. **Given** no text is selected in the PDF document, **When** the user right-clicks the document, **Then** the lookup context menu option remains hidden or disabled.

---

### Edge Cases

- **Scanned or Image-Only PDFs**: When a user attempts to select text on a scanned document that lacks an underlying text layer, the system gracefully refrains from displaying error alerts and indicates that selectable text is required.
- **Hyphenated Line Breaks**: When a word is hyphenated across two lines in a PDF document and selected, the system normalizes the hyphenated segments into a single cohesive word for dictionary lookup.
- **Document Zoom and Rotation**: When the user changes zoom level (e.g., 50% to 200%) or rotates the PDF page orientation while a dictionary popup is open, the popup dismisses cleanly or repositions appropriately without clipping outside the visible viewport.
- **Multi-Column Text Selections**: When text selection accidentally spans across two adjacent columns in a PDF, the system's sanitization validates the extracted term and rejects unintelligible multi-column text strings with an informative message.
- **Protected or DRM-Restricted PDFs**: When a PDF author restricts text selection or copying via document security policies, the system behaves gracefully without producing browser console errors or breaking browser rendering.
- **Rapid Navigation / Page Flipping**: When a user rapidly scrolls through multiple pages or jumps to another page while a lookup request is in flight, any pending popup request is automatically cancelled to prevent displaying orphaned popups on unrelated pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enable dictionary word lookup on all web-hosted PDF documents opened in supported browsers.
- **FR-002**: System MUST enable dictionary word lookup on locally opened PDF documents when local file permissions are granted.
- **FR-003**: System MUST provide clear, step-by-step guidance in extension preferences and notifications instructing users how to enable local file access for local PDF lookups.
- **FR-004**: System MUST trigger single-word lookups via the user's configured interaction trigger (direct double-click or modifier key + double-click) within PDF documents.
- **FR-005**: System MUST support multi-word phrase lookups (2 to 4 words) within PDF documents via text selection indicator or modifier key selection.
- **FR-006**: System MUST provide a right-click context menu option to look up selected text in PDF documents as a reliable fallback.
- **FR-007**: System MUST render the dictionary popup card in an isolated visual container anchored accurately near the selected text within the PDF document view.
- **FR-008**: System MUST display pronunciation phonetics, part of speech badges, comprehensive definitions, and playable pronunciation audio for terms looked up within PDF documents.
- **FR-009**: System MUST dismiss the dictionary popup when the user clicks outside the popup card, presses the Escape key, or navigates/scrolls the PDF page.
- **FR-010**: System MUST respect user preferences (theme mode, modifier key selection, multi-word selection toggle) identically on PDF documents and standard web pages.
- **FR-011**: System MUST sanitize selected PDF text, handling common PDF artifact issues such as trailing punctuation, line-break hyphens, and whitespace anomalies.
- **FR-012**: System MUST prevent interference with native browser PDF viewer controls, toolbars, search bars, and navigation panels.

### Key Entities

- **PDF Document View**: Represents a PDF document rendered inside a browser window, comprising document pages, an active text layer, viewport scale, and scroll position.
- **Lexical Selection**: The textual content selected by the user from the PDF document (single word or multi-word phrase), along with its spatial boundary coordinates on the screen.
- **Dictionary Lookup Card**: The floating, theme-aware presentation card displaying lexical details (phonetics, part of speech, definitions, examples, audio) anchored to the user's selection.
- **Permission State**: The configuration state governing whether the extension has permission to interact with local `file://` documents in addition to remote web URLs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can trigger a word lookup on selectable text in a browser-rendered PDF and view results in under 1 second (excluding external network latency).
- **SC-002**: 100% of core dictionary capabilities (phonetic spelling, part of speech, definitions, usage examples, audio pronunciation) function identically in PDF documents and standard HTML pages.
- **SC-003**: Word lookup precision and sanitization on selectable PDF text achieves parity with standard web page lookups (identical results for equivalent lexical selections).
- **SC-004**: Zero visual collision, style leakage, or functional interference with native browser PDF viewer controls, page zoom, or pagination.
- **SC-005**: At least 95% of users in testing can successfully look up terms on both online PDFs and local PDF files across all supported desktop browsers (Chrome and Firefox).
- **SC-006**: 100% of popup dismiss gestures (Escape key, background click, page scroll) dismiss the dictionary card cleanly without leaving lingering UI artifacts.

## Assumptions

- Target PDF documents contain a digital, selectable text layer. Scanned documents composed purely of raster images without embedded text layers require OCR and are out of scope for this version.
- When opening local `file://` PDF documents, users must grant file URL access in the browser's extension settings due to browser platform security sandboxes.
- The extension respects user-configured trigger keys (e.g., direct double-click or Alt/Cmd/Ctrl/Shift + double-click) consistently across HTML and PDF documents.
- Supported desktop browsers include Google Chrome (and Chromium-based browsers) and Mozilla Firefox with their respective native or built-in PDF viewer environments.
- Offline lookups are bounded by existing caching mechanisms; active internet connectivity is assumed for initial lookups of uncached vocabulary words.
