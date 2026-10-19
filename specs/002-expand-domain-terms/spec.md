# Feature Specification: Technical, Scientific, and Domain-Specific Vocabulary Lookup

**Feature Branch**: `002-expand-domain-terms`  
**Created**: 2026-10-19  
**Status**: Draft  
**Input**: User description: "This dictionary is good in finding meaning of general terms. If searched for technical, scientific, mathematical, business, historical etc words, it should be able to find the meaning. For example, for AI, its not able to show it as abbreviation for Artificial Intelligence."

## Clarifications

### Session 2026-10-19

- Q: Which data source architecture should the addon use to reliably resolve acronym expansions, specialized domain terminology, and historical/scientific overviews? → A: Online-Only Multi-Provider Cascade (Option B) — Query Free Dictionary API, Wiktionary REST API, and Wikipedia REST API dynamically on-demand without bundled offline indices. To prevent latency, queries utilize smart routing (e.g., uppercase/acronym queries route directly to case-sensitive endpoints or query concurrently), strict per-provider timeouts (≤2.5s), and in-memory session caching.
- Q: How should multi-word phrase selections (2–4 words) trigger the dictionary lookup without interfering with normal text copying? → A: Floating Lookup Icon on Highlight + Direct Modifier Trigger (Option A) — Highlighting 2–4 words displays a compact, unobtrusive floating dictionary icon near the selection; clicking it opens the popup. If a modifier key is configured and held during selection, the popup opens directly on mouseup without requiring an extra click.
- Q: How should the dictionary popup visually present both acronym/domain meanings and general English definitions when a term matches both? → A: Stacked Layout with Acronym / Technical First (Option A) — Display the acronym title and technical domain definition prominently at the top, followed by a distinctly demarcated "General English Meanings" section below without requiring tab switching.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abbreviations and Acronym Recognition (Priority: P1)

As a web reader browsing technical articles or reports, I want to double-click an abbreviation, initialism, or acronym (such as "AI", "API", "ROI", "DNA", "GDP", or "HTTP") and immediately see its full expansion (e.g., "AI → Artificial Intelligence") followed by its definition, so that I understand what the acronym stands for without getting confusing or irrelevant definitions of obscure homographs (e.g., a three-toed sloth for "AI").

**Why this priority**: Directly solves the user's primary pain point highlighted in the feature request ("for AI, its not able to show it as abbreviation for Artificial Intelligence"). Acronyms are ubiquitous across technical, business, and scientific literature.

**Independent Test**: Can be tested on any web page by double-clicking uppercase terms such as "AI", "API", or "ROI" and verifying that the popup immediately displays the full expanded title and a definition explaining the concept.

**Acceptance Scenarios**:

1. **Given** a user is reading a webpage with the abbreviation "AI", **When** the user double-clicks the word "AI", **Then** the popup displays "Artificial Intelligence" as the prominent expansion title along with its definition in computer science.
2. **Given** a term that is both an acronym and an ordinary lowercase word (e.g., "RAM" as Random Access Memory vs. "ram" as a male sheep; "WHO" as World Health Organization vs. "who" as a pronoun), **When** the user selects the term in uppercase, **Then** the popup prioritizes the acronym expansion and technical meaning or displays both meanings in clearly distinguished sections.
3. **Given** an acronym formatted with periods (e.g., "A.I.", "e.g.", "i.e.", "U.S."), **When** the user looks up the term, **Then** the system preserves the abbreviation structure and displays the correct expansion and meaning.

---

### User Story 2 - Technical and Scientific Terms Lookup (Priority: P2)

As a student, researcher, or developer reading science or technology publications, I want to look up specialized technical and scientific terms (such as "photosynthesis", "polymorphism", "CRISPR", "hypervisor", "eigenvalue", "homeostasis") and receive precise domain definitions tagged with their respective field (e.g., [Computing], [Biology], [Mathematics]), so that I can understand complex concepts in their proper academic context.

**Why this priority**: Broadens the dictionary's capability beyond everyday conversational vocabulary into rigorous academic and professional domains, fulfilling the user's explicit request for scientific and mathematical vocabulary.

**Independent Test**: Can be tested by looking up specialized terms like "mitochondria", "eigenvalue", or "polymorphism" and verifying that definitions are retrieved with clear domain classification labels.

**Acceptance Scenarios**:

1. **Given** a user looks up a biological or medical term (e.g., "photosynthesis" or "homeostasis"), **When** the dictionary card renders, **Then** it displays the scientific definition with a visible [Biology] or [Science] domain badge.
2. **Given** a user looks up a mathematical or statistical term (e.g., "eigenvalue" or "asymptote"), **When** the dictionary card renders, **Then** it provides a clear mathematical explanation with a [Mathematics] badge.
3. **Given** a user looks up a software or engineering term (e.g., "polymorphism" or "hypervisor"), **When** the dictionary card renders, **Then** it displays the computing definition with a [Computing] or [Technology] badge.

---

### User Story 3 - Business, Financial, and Historical Terms Lookup (Priority: P3)

As a reader reviewing financial news, corporate reports, or historical essays, I want to look up business jargon, economic metrics, and historical eras (such as "amortization", "liquidity", "EBITDA", "Renaissance", "feudalism") and receive clear contextual explanations, so that I can comprehend specialized industry articles without leaving the page.

**Why this priority**: Expands dictionary utility into commerce, governance, and humanities, completing the multi-disciplinary vocabulary coverage requested by the user.

**Independent Test**: Can be tested by double-clicking business terms like "amortization" or historical concepts like "Renaissance", confirming that domain-specific definitions and historical context are rendered.

**Acceptance Scenarios**:

1. **Given** a user looks up a financial or economic term (e.g., "amortization", "liquidity", or "EBITDA"), **When** the popup opens, **Then** it provides the corporate finance or accounting definition labeled with a [Finance] or [Business] badge.
2. **Given** a user looks up a historical period, event, or philosophical movement (e.g., "Renaissance" or "feudalism"), **When** the popup opens, **Then** it displays a concise historical summary and cultural significance labeled with a [History] badge.

---

### User Story 4 - Multi-Word Domain Term Selection (Priority: P4)

As a reader encountering compound technical or economic phrases composed of multiple words (such as "machine learning", "black hole", "compound interest", "operating system", "supply and demand"), I want to highlight the phrase (up to 4 words) and trigger the dictionary lookup, so that I can learn the meaning of the composite concept rather than looking up disconnected single words.

**Why this priority**: A substantial portion of domain terminology consists of multi-word compound nouns that lose their meaning when broken into individual words.

**Independent Test**: Can be tested by highlighting "machine learning" on a webpage; verify that a floating dictionary icon appears near the selection (or the popup opens directly if modifier key is held) and displays the cohesive compound definition on click.

**Acceptance Scenarios**:

1. **Given** a user highlights a 2-to-4 word compound domain phrase (e.g., "machine learning" or "compound interest") without holding a modifier key, **When** the mouse selection is completed, **Then** a compact floating dictionary icon appears adjacent to the selected text; clicking the icon opens the definition card without interfering with standard copy-paste operations.
2. **Given** a user configures a modifier key (Alt, Ctrl, or Shift) and holds it while highlighting a 2-to-4 word compound phrase, **When** the mouse button is released, **Then** the dictionary popup opens immediately adjacent to the phrase.
3. **Given** a user selects a multi-word phrase that is not a recognized compound term, **When** the lookup completes, **Then** the system gracefully provides definitions for the primary keyword or provides an informative message without crashing.

---

### User Story 5 - Disambiguation & Domain Categorization Badges (Priority: P5)

As a reader encountering polysemous words with distinct meanings across multiple disciplines (e.g., "matrix" in mathematics vs. biology vs. geology; "interest" in finance vs. psychology; "driver" in computing vs. golf), I want the definitions to be grouped and clearly badged with domain tags, so that I can quickly scan to the definition that matches my reading context.

**Why this priority**: Prevents domain confusion and visual clutter when words have diverse meanings across technical, scientific, and everyday domains.

**Independent Test**: Can be tested by looking up a polysemous word like "matrix" and verifying that definitions are categorized with explicit domain badges (e.g., [Mathematics], [Biology], [General]).

**Acceptance Scenarios**:

1. **Given** a word has definitions spanning general English and specialized domains (e.g., "matrix"), **When** the popup renders, **Then** definitions are categorized with distinct visual badges such as [Mathematics] and [Biology] alongside general meanings.
2. **Given** an acronym query that is also an everyday word (e.g., "RAM" or "AI"), **When** both definitions are available, **Then** the popup renders a stacked layout with the acronym expansion ("Random Access Memory" or "Artificial Intelligence") and domain definition prominently at the top, followed by a distinctly demarcated "General English Meanings" section below.

---

### Edge Cases

- **Case-Sensitive Disambiguation**: The lookup mechanism must preserve the original text casing from the user selection (e.g., "AI" vs. "ai", "RAM" vs. "ram", "IT" vs. "it") so that uppercase terms are matched against acronyms and technical definitions before fallback to lowercase colloquial definitions.
- **Punctuation in Abbreviations**: Abbreviations with internal or trailing punctuation (e.g., "A.I.", "e.g.", "i.e.", "U.S.", "Ph.D.") must not be prematurely stripped or split into invalid sub-strings.
- **Hyphenated and Slashed Domain Terms**: Technical terms containing hyphens, slashes, or special notation (e.g., "zero-day", "open-source", "client-server", "P/E ratio", "NP-hard") must be retained and looked up as unified entities.
- **Selections Exceeding Word Bounds**: If a user accidentally highlights more than 4 words (e.g., a sentence or paragraph), the system must cleanly ignore or truncate to the first 4 words to prevent wasteful queries.
- **Unrecognized Domain Terms / Jargon**: When a technical term is not found across the online providers, the popup must display a polite, informative empty state suggesting alternative spellings or a direct external reference search link.
- **Offline Resilience**: Since lookups operate online on-demand without a bundled offline database, queries rely on in-memory caching during active browser sessions; when offline, previously cached lookups remain instantly viewable, while uncached queries display an immediate offline notice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect and identify abbreviations, initialisms, and acronyms (e.g., "AI", "API", "ROI", "DNA", "HTTP", "GDP"), displaying their expanded full title alongside definitions.
- **FR-002**: System MUST preserve letter casing from the user selection during lookup to prioritize acronym expansions and specialized proper nouns for uppercase or titlecase terms.
- **FR-003**: System MUST provide definitions for specialized technical and computing terms (e.g., software engineering, computer architectures, cybersecurity, cloud computing).
- **FR-004**: System MUST provide definitions for scientific terms across biology, chemistry, physics, and medicine.
- **FR-005**: System MUST provide definitions for mathematical and statistical concepts (e.g., algebra, calculus, geometry, probability).
- **FR-006**: System MUST provide definitions for business, financial, corporate, and economic terminology.
- **FR-007**: System MUST provide contextual historical definitions and era overviews for significant historical events, movements, and terminology.
- **FR-008**: System MUST display visual domain category badges (e.g., `[Computing]`, `[Biology]`, `[Mathematics]`, `[Finance]`, `[History]`) adjacent to specialized definitions.
- **FR-009**: System MUST support multi-word compound term lookups for user-selected phrases containing between 2 and 4 words (e.g., "machine learning", "compound interest", "operating system") by displaying a compact floating dictionary icon near the selection, or by opening the popup directly if the user's configured modifier key is held.
- **FR-010**: System MUST render a stacked disambiguation layout when a queried term has both an acronym/domain expansion and general English lexical definitions, presenting the acronym and domain meaning prominently at the top, followed by a distinctly styled "General English Meanings" section below without requiring tab switching.
- **FR-011**: System MUST sanitize and preserve abbreviations containing internal periods or slashes (e.g., "A.I.", "e.g.", "P/E ratio").
- **FR-012**: System MUST resolve domain queries using an online-only multi-provider cascade without bundled offline dictionary indices:
  - Tier 1: Wiktionary REST API for case-sensitive acronym expansions and specialized domain-specific lexical definitions.
  - Tier 2: Wikipedia REST API summary endpoint for encyclopedic summaries and historical concepts.
  - Tier 3: Free Dictionary API for general English lexical definitions and spoken audio files.
  - Latency Protection: System MUST prevent multi-hop latency penalties by applying smart query routing (e.g., routing uppercase/acronym terms directly to case-sensitive endpoints or querying concurrently), enforcing strict per-provider network timeouts (≤2.5s), and caching resolved entries in memory.
- **FR-013**: System MUST display an intuitive, non-disruptive loading indicator in the popup while retrieving domain definitions from online tiers.
- **FR-014**: System MUST display clear, polite feedback when a specialized term cannot be found, offering spelling assistance without disrupting host page navigation.
- **FR-015**: System MUST maintain strict user privacy by keeping all domain lookups ephemeral, without recording persistent browsing or search history.

### Key Entities *(include if feature involves data)*

- **DomainLookupRequest**: Represents a user lookup interaction, containing:
  - `rawText`: The exact text string as selected on the page.
  - `cleanTerm`: The sanitized search lemma with extraneous boundary whitespace and quotes removed.
  - `isUppercase`: Boolean flag indicating if the selected term was in uppercase or capitalized format.
  - `wordCount`: Number of words in the selection (1 to 4).
  - `coordinates`: Viewport coordinates for anchoring the popup card.
- **DomainDictionaryEntry**: The resolved dictionary result structure containing:
  - `term`: The canonical word or compound phrase.
  - `isAcronym`: Boolean indicating whether the term was recognized as an acronym or abbreviation.
  - `acronymExpansion`: The full expanded title if the term is an acronym (e.g., "Artificial Intelligence").
  - `meanings`: A list of categorized meaning groups, each containing:
    - `domain`: The field classification label (e.g., "Computing", "Biology", "Mathematics", "Finance", "History", "General").
    - `partOfSpeech`: Grammatical role or abbreviation classification.
    - `definitions`: List of definitions, each with an explanation, domain-specific usage example, and optional synonyms/related terms.
  - `phonetic`: Optional pronunciation guide or phonetic transcription.
  - `audioUrl`: Optional audio URL for spoken pronunciation.
- **DomainCategory**: Standard domain classification labels:
  - `computing`: Software, hardware, networking, artificial intelligence, cybersecurity.
  - `science`: Biology, chemistry, physics, medicine, astronomy, geology.
  - `mathematics`: Algebra, geometry, calculus, statistics, logic.
  - `business`: Finance, accounting, economics, corporate management.
  - `history`: Historical eras, political movements, philosophy, archaeology.
  - `general`: General lexical English vocabulary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of common technical, scientific, business, and mathematical acronyms (such as AI, API, ROI, DNA, GDP, CPU, RAM) display their correct full-form expansion and definition on initial lookup.
- **SC-002**: For polysemous uppercase queries (such as "AI" or "RAM"), 100% of popup renders present the acronym and technical definition either as the primary heading or in a distinct, prominently prioritized section above obscure archaic/biological general meanings.
- **SC-003**: Domain lookup popup displays complete results within 300 to 500 milliseconds under standard broadband conditions; smart routing, concurrent query dispatch, and short timeouts prevent any cascade latency bottlenecks.
- **SC-004**: At least 90% of domain-specific technical, scientific, and business definitions include an identifiable field/domain badge (e.g., `[Computing]`, `[Finance]`).
- **SC-005**: 100% of valid 2-to-4 word compound phrases (e.g., "machine learning", "black hole") selected by the user successfully return compound definitions rather than erroring or truncating to single words.
- **SC-006**: Lookup failure rate on recognized technical terms across computer science, finance, and natural sciences drops by at least 80% compared to general-only vocabulary lookup.

## Assumptions

- **Online-Only Multi-Provider Sources**: The system operates completely online on-demand without bundled offline dictionary indices, utilizing open REST APIs (Wiktionary, Wikipedia summaries, Free Dictionary API) without requiring paid API keys or user account authentication.
- **Case Sensitivity Heuristic**: Terms selected in ALL-CAPS or TitleCase are treated with priority for acronym expansions and domain-specific proper nouns before matching lowercase colloquial definitions.
- **Multi-Word Selection Scope**: Compound term lookup is supported for selections up to 4 words; selections exceeding 4 words are treated as sentence selections and ignored or trimmed to avoid performance degradation.
- **Privacy & Storage**: Domain lookups remain strictly ephemeral with in-memory caching during active browser sessions; no lookup queries or history are persisted to disk or sent to tracking servers.
- **Language Scope**: Scoped to English-language domain terminology and international technical acronyms.
- **Offline Behavior**: Lookups operate online on-demand; entries cached in memory during active browser sessions remain viewable offline, while uncached queries display an informative offline notice without hanging.
