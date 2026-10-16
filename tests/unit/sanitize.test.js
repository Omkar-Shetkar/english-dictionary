import { describe, it, expect } from 'vitest';
import { sanitizeWord, MAX_WORD_LENGTH } from '../../src/common/sanitize.js';

describe('sanitizeWord utility', () => {
  it('sanitizes standard clean words', () => {
    const res = sanitizeWord('dictionary');
    expect(res.isValid).toBe(true);
    expect(res.word).toBe('dictionary');
  });

  it('converts uppercase words to lowercase', () => {
    const res = sanitizeWord('KNOWLEDGE');
    expect(res.isValid).toBe(true);
    expect(res.word).toBe('knowledge');
  });

  it('trims leading and trailing whitespace', () => {
    const res = sanitizeWord('   serendipity   ');
    expect(res.isValid).toBe(true);
    expect(res.word).toBe('serendipity');
  });

  it('strips quotation marks, smart quotes, and punctuation boundaries', () => {
    expect(sanitizeWord('"quoted"').word).toBe('quoted');
    expect(sanitizeWord("'single'").word).toBe('single');
    expect(sanitizeWord('“smart”').word).toBe('smart');
    expect(sanitizeWord('‘curly’').word).toBe('curly');
    expect(sanitizeWord('(parentheses)').word).toBe('parentheses');
    expect(sanitizeWord('[bracketed]').word).toBe('bracketed');
    expect(sanitizeWord('{curly_bracket}').word).toBe('curly_bracket');
    expect(sanitizeWord('word,').word).toBe('word');
    expect(sanitizeWord('sentence.').word).toBe('sentence');
    expect(sanitizeWord('exclaim!').word).toBe('exclaim');
    expect(sanitizeWord('question?').word).toBe('question');
    expect(sanitizeWord('“...ellipses...”').word).toBe('ellipses');
  });

  it('preserves internal hyphens and apostrophes', () => {
    const hyphenated = sanitizeWord('"well-known"');
    expect(hyphenated.isValid).toBe(true);
    expect(hyphenated.word).toBe('well-known');

    const apostrophe = sanitizeWord("don't");
    expect(apostrophe.isValid).toBe(true);
    expect(apostrophe.word).toBe("don't");

    const possessive = sanitizeWord("author's.");
    expect(possessive.isValid).toBe(true);
    expect(possessive.word).toBe("author's");
  });

  it('rejects empty or whitespace-only inputs', () => {
    expect(sanitizeWord('').isValid).toBe(false);
    expect(sanitizeWord('    ').isValid).toBe(false);
    expect(sanitizeWord(null).isValid).toBe(false);
    expect(sanitizeWord(undefined).isValid).toBe(false);
  });

  it('rejects purely numeric inputs', () => {
    expect(sanitizeWord('12345').isValid).toBe(false);
    expect(sanitizeWord('3.14159').isValid).toBe(false);
  });

  it('rejects pure punctuation/symbols', () => {
    expect(sanitizeWord('---').isValid).toBe(false);
    expect(sanitizeWord('!@#$%^&*()').isValid).toBe(false);
    expect(sanitizeWord('""').isValid).toBe(false);
  });

  it('rejects multi-word selections with internal spaces', () => {
    expect(sanitizeWord('two words').isValid).toBe(false);
    expect(sanitizeWord('a long phrase selected').isValid).toBe(false);
  });

  it('rejects words exceeding MAX_WORD_LENGTH', () => {
    const tooLong = 'a'.repeat(MAX_WORD_LENGTH + 1);
    expect(sanitizeWord(tooLong).isValid).toBe(false);

    const longestValid = 'a'.repeat(MAX_WORD_LENGTH);
    expect(sanitizeWord(longestValid).isValid).toBe(true);
  });
});
