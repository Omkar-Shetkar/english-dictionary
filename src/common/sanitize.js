/**
 * Sanitizes and validates user-selected text for dictionary lookup.
 *
 * Requirements:
 * - Trims whitespace and quotes/brackets/punctuation at boundaries.
 * - Preserves internal hyphens (e.g. "well-known") and apostrophes (e.g. "don't").
 * - Filters out pure numeric strings, symbols, or empty selections.
 * - Caps word length to prevent abusive or runaway queries.
 */

// Boundary punctuation: quotes, brackets, periods, commas, colons, slashes, dashes
const LEADING_BOUNDARY_REGEX = /^[\s\p{P}\p{S}]+/u;
const TRAILING_BOUNDARY_REGEX = /[\s\p{P}\p{S}]+$/u;

// Words should contain at least one letter
const HAS_LETTER_REGEX = /\p{L}/u;

export const MAX_WORD_LENGTH = 45;

/**
 * Clean and validate a selected string.
 * @param {string|unknown} rawText - Text from window.getSelection().
 * @returns {{ isValid: boolean, word: string, raw: string }}
 */
export function sanitizeWord(rawText) {
  if (typeof rawText !== 'string') {
    return { isValid: false, word: '', raw: '' };
  }

  const raw = rawText.trim();
  if (!raw) {
    return { isValid: false, word: '', raw };
  }

  // Strip boundary punctuation and symbols
  let cleaned = raw
    .replace(LEADING_BOUNDARY_REGEX, '')
    .replace(TRAILING_BOUNDARY_REGEX, '');

  // Lowercase for dictionary lookup
  cleaned = cleaned.toLowerCase();

  // Basic sanity checks:
  // 1. Must not be empty after cleaning
  // 2. Must not exceed maximum reasonable word length
  // 3. Must contain at least one unicode letter
  // 4. Must not contain whitespace (must be single word/hyphenated token)
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
