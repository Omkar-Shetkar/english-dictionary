import { describe, it, expect } from 'vitest';
import { sanitizeWord, sanitizeDomainTerm, MAX_WORD_LENGTH } from '../../src/common/sanitize.js';

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

describe('sanitizeDomainTerm utility', () => {
  it('preserves casing for uppercase acronyms (e.g., AI, RAM, DNA)', () => {
    const ai = sanitizeDomainTerm('AI');
    expect(ai.isValid).toBe(true);
    expect(ai.term).toBe('AI');
    expect(ai.isUppercase).toBe(true);
    expect(ai.isMultiWord).toBe(false);
    expect(ai.wordCount).toBe(1);

    const ram = sanitizeDomainTerm('"RAM"');
    expect(ram.isValid).toBe(true);
    expect(ram.term).toBe('RAM');
    expect(ram.isUppercase).toBe(true);
  });

  it('preserves internal punctuation in acronyms and abbreviations (e.g., A.I., e.g., P/E ratio)', () => {
    const aiWithDots = sanitizeDomainTerm('A.I.');
    expect(aiWithDots.isValid).toBe(true);
    expect(aiWithDots.term).toBe('A.I.');
    expect(aiWithDots.isUppercase).toBe(true);

    const pe = sanitizeDomainTerm('P/E ratio');
    expect(pe.isValid).toBe(true);
    expect(pe.term).toBe('P/E ratio');
    expect(pe.isMultiWord).toBe(true);
    expect(pe.wordCount).toBe(2);
  });

  it('supports 2 to 4 word compound phrases', () => {
    const twoWords = sanitizeDomainTerm('machine learning');
    expect(twoWords.isValid).toBe(true);
    expect(twoWords.term).toBe('machine learning');
    expect(twoWords.isMultiWord).toBe(true);
    expect(twoWords.wordCount).toBe(2);

    const fourWords = sanitizeDomainTerm('gross domestic product index');
    expect(fourWords.isValid).toBe(true);
    expect(fourWords.wordCount).toBe(4);
    expect(fourWords.isMultiWord).toBe(true);
  });

  it('rejects selections with more than 4 words', () => {
    const fiveWords = sanitizeDomainTerm('this is five words long');
    expect(fiveWords.isValid).toBe(false);
    expect(fiveWords.wordCount).toBe(5);
  });

  it('rejects pure symbols or numeric selections', () => {
    expect(sanitizeDomainTerm('12345').isValid).toBe(false);
    expect(sanitizeDomainTerm('!!!').isValid).toBe(false);
    expect(sanitizeDomainTerm('').isValid).toBe(false);
  });

  it('de-hyphenates words split across PDF line breaks', () => {
    const resWord = sanitizeWord('inter-\nnational');
    expect(resWord.isValid).toBe(true);
    expect(resWord.word).toBe('international');

    const resWindowsNewline = sanitizeWord('trans-\r\nportation');
    expect(resWindowsNewline.isValid).toBe(true);
    expect(resWindowsNewline.word).toBe('transportation');

    const resDomain = sanitizeDomainTerm('com-\nputing');
    expect(resDomain.isValid).toBe(true);
    expect(resDomain.cleanTerm).toBe('computing');

    const resPhrase = sanitizeDomainTerm('machine\nlearning');
    expect(resPhrase.isValid).toBe(true);
    expect(resPhrase.cleanTerm).toBe('machine learning');
  });

  it('removes embedded soft hyphens common in PDF text layers', () => {
    const resSoftHyphen = sanitizeWord('dic\u00ADtion\u00ADary');
    expect(resSoftHyphen.isValid).toBe(true);
    expect(resSoftHyphen.word).toBe('dictionary');

    const resDomainSoft = sanitizeDomainTerm('poly\u00ADmorphism');
    expect(resDomainSoft.isValid).toBe(true);
    expect(resDomainSoft.cleanTerm).toBe('polymorphism');
  });
});
