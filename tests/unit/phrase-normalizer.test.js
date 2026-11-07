import { describe, it, expect } from 'vitest';
import { lemmatizeVerb, generateCandidatePhrases } from '../../src/background/phrase-normalizer.js';

describe('phrase-normalizer: lemmatizeVerb', () => {
  it('correctly maps irregular verbs', () => {
    expect(lemmatizeVerb('bit')).toEqual(['bite']);
    expect(lemmatizeVerb('broke')).toEqual(['break']);
    expect(lemmatizeVerb('spilled')).toEqual(['spill']);
    expect(lemmatizeVerb('spilt')).toEqual(['spill']);
    expect(lemmatizeVerb('pulled')).toEqual(['pull']);
    expect(lemmatizeVerb('lost')).toEqual(['lose']);
    expect(lemmatizeVerb('kept')).toEqual(['keep']);
    expect(lemmatizeVerb('went')).toEqual(['go']);
    expect(lemmatizeVerb('took')).toEqual(['take']);
    expect(lemmatizeVerb('gave')).toEqual(['give']);
  });

  it('handles regular past tense (-ed) and continuous (-ing)', () => {
    expect(lemmatizeVerb('kicked')).toContain('kick');
    expect(lemmatizeVerb('cried')).toContain('cry');
    expect(lemmatizeVerb('dancing')).toContain('dance');
    expect(lemmatizeVerb('dropping')).toContain('drop');
  });
});

describe('phrase-normalizer: generateCandidatePhrases', () => {
  it('generates exact phrase as primary candidate', () => {
    const candidates = generateCandidatePhrases('bite the bullet');
    expect(candidates[0]).toBe('bite the bullet');
  });

  it('lemmatizes conjugated past-tense idioms', () => {
    const candidates = generateCandidatePhrases('bit the bullet');
    expect(candidates).toContain('bit the bullet');
    expect(candidates).toContain('bite the bullet');

    const spilled = generateCandidatePhrases('spilled the beans');
    expect(spilled).toContain('spill the beans');
  });

  it('normalizes personal pronouns to template wildcards', () => {
    const leg = generateCandidatePhrases('pulling my leg');
    expect(leg).toContain("pulling someone's leg");
    expect(leg).toContain("pulling one's leg");
    expect(leg).toContain("pull someone's leg");
    expect(leg).toContain("pull one's leg");

    const cool = generateCandidatePhrases('lost his cool');
    expect(cool).toContain("lost one's cool");
    expect(cool).toContain("lose one's cool");
  });

  it('handles empty or single-word gracefully', () => {
    expect(generateCandidatePhrases('')).toEqual([]);
    expect(generateCandidatePhrases('weather')).toEqual(['weather']);
  });
});
