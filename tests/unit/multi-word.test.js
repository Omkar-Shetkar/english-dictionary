import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeDomainTerm } from '../../src/common/sanitize.js';
import { FloatingIcon } from '../../src/content/floating-icon.js';

describe('multi-word domain term selection', () => {
  describe('word count validation and bounds', () => {
    it('accepts 2-word compound phrases', () => {
      const res = sanitizeDomainTerm('machine learning');
      expect(res.isValid).toBe(true);
      expect(res.cleanTerm).toBe('machine learning');
      expect(res.wordCount).toBe(2);
      expect(res.isMultiWord).toBe(true);
    });

    it('accepts 3-word compound phrases', () => {
      const res = sanitizeDomainTerm('supply and demand');
      expect(res.isValid).toBe(true);
      expect(res.cleanTerm).toBe('supply and demand');
      expect(res.wordCount).toBe(3);
      expect(res.isMultiWord).toBe(true);
    });

    it('accepts 4-word compound phrases', () => {
      const res = sanitizeDomainTerm('operating system kernel space');
      expect(res.isValid).toBe(true);
      expect(res.cleanTerm).toBe('operating system kernel space');
      expect(res.wordCount).toBe(4);
      expect(res.isMultiWord).toBe(true);
    });

    it('rejects selections with more than 4 words', () => {
      const res = sanitizeDomainTerm('this is a sentence with five words');
      expect(res.isValid).toBe(false);
      expect(res.cleanTerm).toBe('');
      expect(res.wordCount).toBe(7);
    });

    it('differentiates single words from multi-word phrases', () => {
      const single = sanitizeDomainTerm('polymorphism');
      expect(single.isValid).toBe(true);
      expect(single.wordCount).toBe(1);
      expect(single.isMultiWord).toBe(false);
    });

    it('strips boundary quotes, punctuation, and brackets from compound terms', () => {
      const res = sanitizeDomainTerm('“machine learning”');
      expect(res.isValid).toBe(true);
      expect(res.cleanTerm).toBe('machine learning');

      const res2 = sanitizeDomainTerm('(compound interest)');
      expect(res2.isValid).toBe(true);
      expect(res2.cleanTerm).toBe('compound interest');
    });

    it('preserves hyphens and slashes within compound technical terms', () => {
      const res = sanitizeDomainTerm('zero-day vulnerability');
      expect(res.isValid).toBe(true);
      expect(res.cleanTerm).toBe('zero-day vulnerability');
      expect(res.wordCount).toBe(2);

      const res2 = sanitizeDomainTerm('P/E ratio analysis');
      expect(res2.isValid).toBe(true);
      expect(res2.cleanTerm).toBe('P/E ratio analysis');
      expect(res2.wordCount).toBe(3);
    });

    it('rejects multi-word selections containing pure numbers or symbols', () => {
      expect(sanitizeDomainTerm('123 456 789').isValid).toBe(false);
      expect(sanitizeDomainTerm('$$$ ### @@@').isValid).toBe(false);
    });
  });

  describe('FloatingIcon component', () => {
    let icon;

    beforeEach(() => {
      icon = new FloatingIcon();
      icon.setStyles('.dict-floating-btn { display: block; }');
    });

    it('instantiates and configures styles', () => {
      expect(icon).toBeDefined();
      expect(icon.cssText).toContain('.dict-floating-btn');
    });

    it('dismisses cleanly without errors even when unmounted', () => {
      expect(() => icon.dismiss()).not.toThrow();
    });
  });
});
