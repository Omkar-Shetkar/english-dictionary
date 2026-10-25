/**
 * Sanitizes and validates user-selected text for dictionary lookup.
 *
 * Requirements:
 * - Trims whitespace and quotes/brackets/punctuation at boundaries.
 * - Preserves internal hyphens (e.g. "well-known") and apostrophes (e.g. "don't").
 * - Supports uppercase acronyms (e.g. "AI", "RAM", "DNA") and abbreviations with internal dots/slashes (e.g. "A.I.", "P/E ratio").
 * - Supports multi-word compound phrases (2 to 4 words, e.g. "machine learning", "compound interest").
 * - Filters out pure numeric strings, symbols, or empty selections.
 * - Caps word/phrase length to prevent abusive or runaway queries.
 */

// Boundary punctuation: quotes, brackets, periods, commas, colons, slashes, dashes
const LEADING_BOUNDARY_REGEX = /^[\s"'“‘(\[{<«]+/u;
const TRAILING_BOUNDARY_REGEX = /[\s"'”’)\]}>».,:;!?-]+$/u;

// Words should contain at least one unicode letter
const HAS_LETTER_REGEX = /\p{L}/u;

export const MAX_WORD_LENGTH = 45;
export const MAX_PHRASE_WORDS = 4;
export const MAX_PHRASE_LENGTH = 120;

/**
 * Pre-cleans PDF-specific typography artifacts:
 * - Strips soft hyphens (\u00AD) embedded in digital PDF text layers.
 * - De-hyphenates words split across line breaks (e.g. "inter-\n\rnational" -> "international").
 * @param {string} text
 * @returns {string}
 */
export function preCleanPdfArtifacts(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\u00AD/g, '')
    .replace(/(\p{L})[-‐‑‒–—]\s*[\r\n]+\s*(\p{L})/gu, '$1$2');
}

/**
 * Clean and validate a single selected word lemma (legacy / single-word lookup).
 * Lowercases word for standard dictionary querying.
 * @param {string|unknown} rawText - Text from window.getSelection().
 * @returns {{ isValid: boolean, word: string, raw: string }}
 */
export function sanitizeWord(rawText) {
  if (typeof rawText !== 'string') {
    return { isValid: false, word: '', raw: '' };
  }

  const raw = preCleanPdfArtifacts(rawText).trim();
  if (!raw) {
    return { isValid: false, word: '', raw };
  }

  // Strip boundary punctuation and symbols
  let cleaned = raw
    .replace(/^[\s\p{P}\p{S}]+/u, '')
    .replace(/[\s\p{P}\p{S}]+$/u, '');

  // Lowercase for traditional dictionary lookup
  cleaned = cleaned.toLowerCase();

  const isValid = Boolean(
    cleaned.length > 0 &&
    cleaned.length <= MAX_WORD_LENGTH &&
    HAS_LETTER_REGEX.test(cleaned) &&
    !/\s/.test(cleaned)
  );

  return {
    isValid,
    word: isValid ? cleaned : '',
    raw
  };
}

/**
 * Clean and validate a domain term or compound phrase (1 to 4 words),
 * preserving casing for acronyms and internal punctuation for abbreviations.
 * @param {string|unknown} rawText
 * @returns {{
 *   isValid: boolean,
 *   term: string,
 *   cleanTerm: string,
 *   raw: string,
 *   isUppercase: boolean,
 *   isMultiWord: boolean,
 *   wordCount: number
 * }}
 */
export function sanitizeDomainTerm(rawText) {
  if (typeof rawText !== 'string') {
    return {
      isValid: false,
      term: '',
      cleanTerm: '',
      raw: '',
      isUppercase: false,
      isMultiWord: false,
      wordCount: 0
    };
  }

  const raw = preCleanPdfArtifacts(rawText).trim();
  if (!raw) {
    return {
      isValid: false,
      term: '',
      cleanTerm: '',
      raw,
      isUppercase: false,
      isMultiWord: false,
      wordCount: 0
    };
  }

  // Normalize internal whitespace
  const normalizedSpaces = raw.replace(/\s+/g, ' ');

  // Strip leading and trailing boundary quotes/brackets/delimiters
  let cleaned = normalizedSpaces
    .replace(LEADING_BOUNDARY_REGEX, '')
    .trim();

  // If input matches dotted abbreviations (e.g. "A.I.", "e.g.", "U.S."), preserve trailing dot
  const dottedAbbrevMatch = cleaned.match(/^([A-Za-z]\.(?:[A-Za-z]\.)+)(?:[\s"'”’)\]}>».,:;!?-]*)$/);
  if (dottedAbbrevMatch) {
    cleaned = dottedAbbrevMatch[1];
  } else {
    cleaned = cleaned.replace(TRAILING_BOUNDARY_REGEX, '').trim();
  }

  if (!cleaned || cleaned.length > MAX_PHRASE_LENGTH || !HAS_LETTER_REGEX.test(cleaned)) {
    return {
      isValid: false,
      term: '',
      cleanTerm: '',
      raw,
      isUppercase: false,
      isMultiWord: false,
      wordCount: 0
    };
  }

  const words = cleaned.split(' ').filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0 || wordCount > MAX_PHRASE_WORDS) {
    return {
      isValid: false,
      term: '',
      cleanTerm: '',
      raw,
      isUppercase: false,
      isMultiWord: false,
      wordCount
    };
  }

  // Disallow pure numbers/symbols in any token
  const hasInvalidToken = words.some((w) => !HAS_LETTER_REGEX.test(w) || w.length > MAX_WORD_LENGTH);
  if (hasInvalidToken) {
    return {
      isValid: false,
      term: '',
      cleanTerm: '',
      raw,
      isUppercase: false,
      isMultiWord: false,
      wordCount
    };
  }

  const isMultiWord = wordCount > 1;
  const lettersOnly = cleaned.replace(/[^\p{L}]/gu, '');
  const isUppercase = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();

  return {
    isValid: true,
    term: cleaned,
    cleanTerm: cleaned,
    raw,
    isUppercase,
    isMultiWord,
    wordCount
  };
}
