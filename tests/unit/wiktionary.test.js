import { describe, it, expect } from 'vitest';
import { cleanHtml, normalizeWiktionaryPayload } from '../../src/background/normalizers/wiktionary.js';

describe('wiktionary normalizer', () => {
  describe('cleanHtml', () => {
    it('strips HTML tags and decodes entities', () => {
      expect(cleanHtml('<p>(computing) <a href="/wiki/AI">Artificial intelligence</a>.</p>')).toBe('(computing) Artificial intelligence.');
      expect(cleanHtml('P&amp;E ratio &quot;growth&quot;')).toBe('P&E ratio "growth"');
    });
  });

  describe('normalizeWiktionaryPayload', () => {
    it('normalizes uppercase acronym entry (e.g., AI)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Noun',
            definitions: [
              {
                definition: '<p>(computing) <a href="/wiki/Artificial_intelligence">Artificial intelligence</a>.</p>',
                examples: ['We used AI to classify the data.']
              },
              {
                definition: '<p>(medicine) Aortic insufficiency.</p>'
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'AI');
      expect(result).not.toBeNull();
      expect(result.word).toBe('AI');
      expect(result.isAcronym).toBe(true);
      expect(result.acronymExpansion).toBe('Artificial Intelligence');
      expect(result.meanings.length).toBeGreaterThan(0);
      expect(result.meanings[0].domain).toBe('Computing');
      expect(result.meanings[0].definitions[0].definition).toContain('Artificial intelligence');
      expect(result.meanings[0].definitions[0].example).toBe('We used AI to classify the data.');
    });

    it('separates domain-specific meanings from general lexical meanings for stacked disambiguation', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Noun',
            definitions: [
              {
                definition: '<p>(computing) Random-access memory.</p>'
              },
              {
                definition: '<p>A male sheep, typically with large curved horns.</p>'
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'RAM');
      expect(result).not.toBeNull();
      expect(result.meanings[0].domain).toBe('Computing');
      expect(result.generalMeanings.length).toBeGreaterThan(0);
      expect(result.generalMeanings[0].domain).toBe('General');
      expect(result.generalMeanings[0].definitions[0].definition).toContain('male sheep');
    });

    it('detects initialisms and acronyms with explicit patterns (e.g., API, ROI, HTTP)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Noun',
            definitions: [
              {
                definition: '<p>Initialism of <a href="/wiki/application_programming_interface">application programming interface</a>.</p>'
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'API');
      expect(result).not.toBeNull();
      expect(result.word).toBe('API');
      expect(result.isAcronym).toBe(true);
      expect(result.acronymExpansion).toBe('Application Programming Interface');
      expect(result.meanings[0].domain).toBe('Computing');
    });

    it('preserves uppercase casing and extracts expansions for financial/business acronyms (e.g., ROI)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Noun',
            definitions: [
              {
                definition: '<p>(finance) Abbreviation of return on investment.</p>'
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'ROI');
      expect(result).not.toBeNull();
      expect(result.word).toBe('ROI');
      expect(result.isAcronym).toBe(true);
      expect(result.acronymExpansion).toBe('Return On Investment');
      expect(result.meanings[0].domain).toBe('Business');
    });

    it('handles dotted abbreviations cleanly (e.g., A.I.)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Noun',
            definitions: [
              {
                definition: '<p>Alternative form of <a href="/wiki/AI">AI</a> (Artificial intelligence).</p>'
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'A.I.');
      expect(result).not.toBeNull();
      expect(result.word).toBe('A.I.');
      expect(result.isAcronym).toBe(true);
      expect(result.acronymExpansion).toBe('Artificial Intelligence');
    });

    it('returns null on invalid or empty payloads', () => {
      expect(normalizeWiktionaryPayload(null, 'test')).toBeNull();
      expect(normalizeWiktionaryPayload({}, 'test')).toBeNull();
      expect(normalizeWiktionaryPayload({ en: [] }, 'test')).toBeNull();
    });

    it('normalizes multi-word idiom entries (e.g., bite the bullet)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Phrase',
            etymology: 'From the historical practice of having soldiers bite on a lead bullet during surgery.',
            definitions: [
              {
                definition: '<p>(idiomatic) To accept or endure a grim or dire situation with fortitude.</p>',
                examples: ["We'll just have to bite the bullet and pay the fee."]
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'bite the bullet');
      expect(result).not.toBeNull();
      expect(result.word).toBe('bite the bullet');
      expect(result.expressionType).toBe('idiom');
      expect(result.origin).toContain('lead bullet during surgery');
      expect(result.meanings[0].domain).toBe('Idiom');
      expect(result.meanings[0].definitions[0].definition).toContain('accept or endure a grim or dire situation');
      expect(result.meanings[0].definitions[0].example).toBe("We'll just have to bite the bullet and pay the fee.");
    });

    it('normalizes proverb entries (e.g., actions speak louder than words)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Proverb',
            definitions: [
              {
                definition: '<p>What one does is more significant than what one says.</p>',
                examples: ['He promised to fix it, but actions speak louder than words.']
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'actions speak louder than words');
      expect(result).not.toBeNull();
      expect(result.expressionType).toBe('proverb');
      expect(result.meanings[0].domain).toBe('Proverb');
      expect(result.meanings[0].definitions[0].definition).toContain('more significant than what one says');
    });

    it('normalizes phrasal verbs with transitivity/separability (e.g., look forward to)', () => {
      const mockPayload = {
        en: [
          {
            partOfSpeech: 'Verb',
            definitions: [
              {
                definition: '<p>(idiomatic, transitive, inseparable) To anticipate with pleasure or eager expectation.</p>',
                examples: ['I look forward to hearing from you.']
              }
            ]
          }
        ]
      };

      const result = normalizeWiktionaryPayload(mockPayload, 'look forward to');
      expect(result).not.toBeNull();
      expect(result.expressionType).toBe('phrasal_verb');
      expect(result.meanings[0].domain).toBe('Phrasal Verb');
      expect(result.meanings[0].definitions[0].grammarNotes.transitivity).toBe('transitive');
      expect(result.meanings[0].definitions[0].grammarNotes.separability).toBe('inseparable');
    });
  });
});
