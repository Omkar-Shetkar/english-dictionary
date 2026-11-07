# Feature Specification: Idioms and Phrasal Expressions Lookup

**Feature Branch**: `005-idioms-and-phrases`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "We want to support Idioms and Phrases as well"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Word Idioms and Figurative Sayings Lookup (Priority: P1)

As a student, language learner, or avid reader encountering figurative language (such as "bite the bullet", "break the ice", "piece of cake", "under the weather", or "spill the beans"), I want to select the multi-word phrase and immediately view its figurative definition, explanation, and example sentences in the popup card, so that I understand the intended figurative meaning rather than getting confused by literal word-by-word definitions.

**Why this priority**: Core value of the feature. Idioms are non-compositional expressions where literal interpretation fails. Providing clear figurative explanations is essential for reading comprehension.

**Independent Test**: Can be tested on any web page by highlighting phrases like "bite the bullet" or "break the ice" and verifying that the popup card displays the figurative meaning (e.g., "to endure a painful situation with courage") with an explicit idiom classification badge and example sentences.

**Acceptance Scenarios**:

1. **Given** a user is reading an article containing the phrase "bite the bullet", **When** the user highlights the phrase and triggers lookup, **Then** the popup card renders with an [Idiom] badge, the figurative definition explaining the expression, and at least one illustrative example sentence.
2. **Given** a phrase with both literal and idiomatic meanings (e.g., "spill the beans"), **When** the user looks up the phrase, **Then** the card emphasizes the figurative meaning ("reveal a secret prematurely") as the primary entry while providing access to the literal word breakdown in a secondary or expandable section.
3. **Given** a proverb or well-known adage (e.g., "actions speak louder than words" or "better late than never"), **When** the user highlights the phrase, **Then** the popup displays the proverb's wisdom/meaning and cultural context labeled with a [Proverb] badge.

---

### User Story 2 - Phrasal and Prepositional Verbs Lookup (Priority: P2)

As a reader encountering multi-word phrasal verbs (such as "give up", "run out of", "look forward to", "take after", "bring up", or "call off"), I want to select the verb phrase and receive a definition specific to that multi-word verb combination, including grammatical usage notes (such as transitivity and separability), so that I understand how the verb functions differently from the isolated base verb.

**Why this priority**: Phrasal verbs represent one of the most frequent and challenging stumbling blocks in English prose, occurring extensively in casual, journalistic, and professional writing.

**Independent Test**: Can be tested by selecting phrasal verbs like "give up" or "look forward to" and confirming that the popup presents the phrasal verb's specific meaning and grammatical characteristics, rather than only defining "give" or "look".

**Acceptance Scenarios**:

1. **Given** a user selects a two-word or three-word phrasal verb (e.g., "look forward to"), **When** the lookup triggers, **Then** the card displays the combined definition ("anticipate with pleasure") labeled with a [Phrasal Verb] badge.
2. **Given** a phrasal verb with grammatical constraints (e.g., whether it can be separated by an object, such as "turn [it] off" vs. "run into [someone]"), **When** the definition card renders, **Then** it provides clear grammatical usage indicators (e.g., [Transitive], [Inseparable]) alongside contextual example sentences.
3. **Given** a phrasal verb with multiple distinct meanings (e.g., "take off" meaning to remove clothing, an aircraft departing, or becoming rapidly successful), **When** the user views the card, **Then** all common meanings of the phrasal verb are clearly numbered and organized.

---

### User Story 3 - Inflected Forms, Tenses, and Pronoun Variations (Priority: P3)

As a reader reading flowing prose where idioms appear in past tense, continuous aspect, or personalized with pronouns (e.g., "bit the bullet", "kicking the bucket", "pulling my leg", "kept her fingers crossed"), I want the dictionary to automatically resolve the inflected or personalized text to its canonical base idiom ("bite the bullet", "pull someone's leg", "keep one's fingers crossed"), so that lookups succeed regardless of grammatical conjugation.

**Why this priority**: In real-world reading, idioms rarely appear strictly in their base dictionary form. Rigid verbatim matching would fail for a large fraction of real reading occurrences.

**Independent Test**: Can be tested by selecting conjugated and inflected variants such as "bit the bullet", "spilled the beans", and "pulling his leg", and verifying that all resolve smoothly to the canonical idiom entry with full definitions.

**Acceptance Scenarios**:

1. **Given** a user highlights a past-tense or participle form of an idiom (e.g., "spilled the beans" or "broken the ice"), **When** the lookup triggers, **Then** the system successfully identifies the canonical idiom ("spill the beans" / "break the ice") and displays the definition and examples.
2. **Given** an idiom containing a possessive or personal pronoun in text (e.g., "pulling your leg", "on her last legs", "lost his cool"), **When** the user highlights the phrase, **Then** the system matches the entry against the canonical pattern ("pull someone's leg", "on one's last legs", "lose one's cool") and presents the definition.
3. **Given** an inflected lookup, **When** the popup card renders, **Then** it clearly shows the canonical headword form so the user learns the standard expression while confirming their selected phrase was recognized.

---

### User Story 4 - Discovering Related Idioms from Single-Word Lookups (Priority: P4)

As a curious reader or language learner looking up a single vocabulary word (e.g., "weather", "ice", "stone", "water", "blue"), I want to see a list of popular idioms and expressions featuring that word within the popup card, so that I can broaden my expressive vocabulary and discover figurative uses connected to words I look up.

**Why this priority**: Connects existing word lookup workflows to idiom discovery, helping users learn expressions they might not have known were idioms beforehand.

**Independent Test**: Can be tested by double-clicking the word "weather" or "ice", observing an expandable "Related Idioms & Phrases" section at the bottom of the card, clicking one (e.g., "under the weather"), and verifying that the popup transitions to that idiom's full definition.

**Acceptance Scenarios**:

1. **Given** a user looks up a single word that is a keyword in popular idioms (e.g., "weather"), **When** the dictionary card renders, **Then** it includes an expandable or compact "Related Idioms & Phrases" section listing expressions such as "under the weather" and "weather the storm".
2. **Given** a user clicks on one of the suggested idioms within the related phrases section, **When** clicked, **Then** the popup card navigates to display the full definition, badge, and examples for that selected idiom without closing the card.
3. **Given** a word with no established idiomatic expressions, **When** looked up, **Then** the related idioms section is omitted cleanly without taking up unnecessary visual space.

---

### User Story 5 - Right-Click Context Menu Lookup for Selected Phrases (Priority: P5)

As a user reading complex layouts or PDF documents where double-clicking only selects a single word, I want to select a multi-word phrase and use the right-click context menu ("Look up in Simple English Dictionary") to look up the idiom, so that I have a consistent, reliable trigger across all web pages and documents.

**Why this priority**: Context menu lookup provides the universal fallback interaction for multi-word phrases across desktop environments and PDF documents.

**Independent Test**: Can be tested on both standard web pages and PDF documents by selecting "actions speak louder than words", right-clicking, selecting "Look up in Simple English Dictionary", and confirming the popup card opens near the selection with the complete idiom definition.

**Acceptance Scenarios**:

1. **Given** a user selects an idiom or phrase (between 2 and 8 words) in a webpage or PDF document, **When** the user right-clicks and chooses the dictionary context menu option, **Then** the popup card opens anchored to the selection displaying the idiom definition.
2. **Given** the context menu item is clicked for an idiomatic phrase, **When** the lookup executes, **Then** the menu item label indicates a phrase lookup or seamlessly processes the selected phrase.

---

### Edge Cases

- **Hyphenated and Punctuated Phrases**: Phrases containing hyphens, apostrophes, or surrounding quotation marks (e.g., "tit-for-tat", "'piece of cake'", "spill-the-beans") must have surrounding punctuation stripped and internal hyphens normalized to whitespace or accepted as valid phrase variants.
- **Intervening Modifiers and Adverbs**: When common idioms include intervening words (e.g., "bite the proverbial bullet", "pulled entirely out of thin air"), the system should attempt to recognize the underlying canonical idiom or offer it as a top suggestion.
- **Unrecognized Multi-Word Phrases**: When a user selects a multi-word sequence that is neither a recognized idiom nor a compound term (e.g., "the quick brown fox jumped"), the system must display an informative "No idiomatic expression found" card with options to look up the individual words.
- **Overlapping Expressions**: When a selected phrase contains multiple possible sub-phrases (e.g., selecting "take a break from" which could match "take a break" or "break from"), the system must prioritize the most comprehensive, specific idiom match.
- **Selection Length Boundaries**: Text selections beyond 8 words should either evaluate the leading words for an idiom match or gently guide the user to select the specific phrase of interest.
- **Case Sensitivity**: Idioms should match case-insensitively (e.g., "Break A Leg" matches "break a leg"), while preserving proper noun capitalization where relevant (e.g., "Achilles' heel", "Pandora's box").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support looking up multi-word idioms, proverbs, and sayings consisting of 2 to at least 8 words.
- **FR-002**: System MUST visually identify the nature of the expression using prominent classification tags (e.g., `[Idiom]`, `[Proverb]`, `[Phrasal Verb]`, or `[Saying]`).
- **FR-003**: System MUST provide the figurative definition and explanation of the phrase, explaining what the expression means in plain language.
- **FR-004**: System MUST display at least one realistic contextual example sentence illustrating how the idiom or phrase is used in sentences.
- **FR-005**: System MUST resolve inflected verb forms, tenses, and participles (e.g., "spilled the beans", "biting the bullet", "broke the ice") to their canonical idiom headwords ("spill the beans", "bite the bullet", "break the ice").
- **FR-006**: System MUST resolve variable pronoun references (e.g., "pulling my leg", "lost his cool", "on their toes") to canonical pattern representations (e.g., "pull someone's leg", "lose one's cool", "on one's toes").
- **FR-007**: System MUST support phrasal and prepositional verbs (e.g., "give up", "look forward to", "run into") and provide transitivity and separability notes where applicable.
- **FR-008**: System MUST prioritize the figurative meaning when a phrase has dual literal and idiomatic meanings, while keeping literal explanations accessible in a secondary section.
- **FR-009**: System MUST display an expandable or linked "Related Idioms & Phrases" list on single-word lookups when established idioms exist for that root word.
- **FR-010**: Users MUST be able to click any suggested idiom in the related phrases list to view its complete definition without closing the popup.
- **FR-011**: System MUST support looking up selected idioms and phrases via the right-click context menu across web pages and PDF documents.
- **FR-012**: System MUST sanitize phrase selections by trimming whitespace, stripping leading and trailing punctuation, and normalizing internal spacing.
- **FR-013**: When a selected phrase yields no idiom match, the system MUST display a clear "Phrase not found" state offering quick links or suggestions to look up individual constituent words.
- **FR-014**: When origin or etymological background is available for an idiom (e.g., historical story behind "bite the bullet"), the system MUST provide it in an optional "Origin" section.

### Key Entities *(include if feature involves data)*

- **Idiomatic Phrase**: Represents a recognized idiom, proverb, or phrasal verb.
  - *Key attributes*: Canonical text (e.g., "bite the bullet"), expression type (`idiom`, `proverb`, `phrasal_verb`, `saying`), figurative definition, origin/etymology note (optional), grammatical characteristics (transitivity, separability), tone/register (informal, colloquial, formal, humorous), and list of example sentences.
- **Phrase Variant**: Represents a common inflected, conjugated, or substituted surface form that maps to a canonical Idiomatic Phrase.
  - *Key attributes*: Surface pattern, tense/variation type, reference to canonical Idiomatic Phrase.
- **Related Idiom Index**: Association between core vocabulary words and the idioms that contain them.
  - *Key attributes*: Root word, linked canonical idiom titles, short summary definition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive definition results for selected idioms and phrases within 1.5 seconds of trigger under typical network conditions.
- **SC-002**: At least 90% of common English idioms tested in inflected or tense-shifted forms (e.g., "spilled the beans", "biting the bullet", "pulled her leg") successfully resolve to their canonical idiom entry.
- **SC-003**: 100% of idiom and phrasal verb definitions clearly display an expression badge (`[Idiom]`, `[Proverb]`, `[Phrasal Verb]`) to prevent confusion with literal word definitions.
- **SC-004**: Users can navigate from a single-word definition to a related idiom's definition in a single click with zero full-page reloads.
- **SC-005**: Querying idioms and phrases causes zero regression in existing single-word lookup speed, accuracy, or memory consumption.
- **SC-006**: Lookups for unrecognized phrases cleanly display actionable guidance or individual word lookups in 100% of non-matching queries without unhandled errors.

## Assumptions

- **Phrase Selection Length**: Multi-word phrase lookups target selections between 2 and 8 words. Selections beyond 8 words are evaluated for leading idiom patterns or prompted for tighter selection.
- **Lexical Data Sources**: Idiom and phrasal definitions will be retrieved dynamically from open lexical APIs and public dictionary services (e.g., Wiktionary, Free Dictionary API, WordNet) on-demand, without requiring a multi-megabyte static idiom database packaged inside the browser extension.
- **Language Scope**: Initial release focuses on contemporary English idioms, proverbs, and phrasal verbs commonly found in online reading materials.
- **Trigger Consistency**: Phrase lookups will be triggered via drag-selection followed by either the floating trigger icon, modifier-key double-click/selection (as configured in preferences), or the right-click context menu.
- **PDF Compatibility**: Multi-word idiom selection and context-menu lookups will work identically in browser-rendered PDF documents in accordance with existing PDF support capabilities.
