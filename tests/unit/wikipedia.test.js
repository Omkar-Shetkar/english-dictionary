import { describe, it, expect } from 'vitest';
import { normalizeWikipediaSummary } from '../../src/background/normalizers/wikipedia.js';

describe('wikipedia normalizer', () => {
  it('normalizes standard encyclopedic lead summary', () => {
    const mockPayload = {
      type: 'standard',
      title: 'Artificial intelligence',
      description: 'Field of computer science',
      extract: 'Artificial intelligence (AI) is intelligence exhibited by machines.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Artificial_intelligence'
        }
      }
    };

    const result = normalizeWikipediaSummary(mockPayload, 'AI');
    expect(result).not.toBeNull();
    expect(result.word).toBe('Artificial intelligence');
    expect(result.isAcronym).toBe(true);
    expect(result.acronymExpansion).toBe('Artificial intelligence');
    expect(result.meanings[0].domain).toBe('Computing');
    expect(result.encyclopedicSummary).toContain('intelligence exhibited by machines');
    expect(result.referenceUrl).toBe('https://en.wikipedia.org/wiki/Artificial_intelligence');
  });

  it('normalizes historical era concepts (e.g., Renaissance)', () => {
    const mockPayload = {
      type: 'standard',
      title: 'Renaissance',
      description: 'Period in European history',
      extract: 'The Renaissance was a period in European history marking the transition from the Middle Ages to modernity.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Renaissance'
        }
      }
    };

    const result = normalizeWikipediaSummary(mockPayload, 'Renaissance');
    expect(result).not.toBeNull();
    expect(result.meanings[0].domain).toBe('History');
    expect(result.encyclopedicSummary).toContain('transition from the Middle Ages');
  });

  it('normalizes multi-word compound concepts (e.g., machine learning)', () => {
    const mockPayload = {
      type: 'standard',
      title: 'Machine learning',
      description: 'Field of study in artificial intelligence',
      extract: 'Machine learning is a field of study in artificial intelligence concerned with the development of statistical algorithms.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Machine_learning'
        }
      }
    };

    const result = normalizeWikipediaSummary(mockPayload, 'machine learning');
    expect(result).not.toBeNull();
    expect(result.meanings[0].domain).toBe('Computing');
    expect(result.encyclopedicSummary).toContain('statistical algorithms');
  });

  it('normalizes financial and economic metrics (e.g., EBITDA, amortization)', () => {
    const mockPayload = {
      type: 'standard',
      title: 'EBITDA',
      description: 'Financial metric',
      extract: 'Earnings before interest, taxes, depreciation, and amortization (EBITDA) is an accounting metric.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/EBITDA'
        }
      }
    };

    const result = normalizeWikipediaSummary(mockPayload, 'EBITDA');
    expect(result).not.toBeNull();
    expect(result.word).toBe('EBITDA');
    expect(result.isAcronym).toBe(true);
    expect(result.meanings[0].domain).toBe('Business');
    expect(result.encyclopedicSummary).toContain('Earnings before interest');
    expect(result.referenceUrl).toBe('https://en.wikipedia.org/wiki/EBITDA');
  });

  it('normalizes historical systems and epochs (e.g., feudalism)', () => {
    const mockPayload = {
      type: 'standard',
      title: 'Feudalism',
      description: 'Medieval social and economic system',
      extract: 'Feudalism, also known as the feudal system, was a combination of legal, economic, and military customs in medieval Europe.',
      content_urls: {
        desktop: {
          page: 'https://en.wikipedia.org/wiki/Feudalism'
        }
      }
    };

    const result = normalizeWikipediaSummary(mockPayload, 'feudalism');
    expect(result).not.toBeNull();
    expect(result.meanings[0].domain).toBe('History');
    expect(result.encyclopedicSummary).toContain('medieval Europe');
  });

  it('rejects disambiguation pages or empty extracts', () => {
    expect(normalizeWikipediaSummary({ type: 'disambiguation', extract: 'Many meanings' }, 'AI')).toBeNull();
    expect(normalizeWikipediaSummary({ type: 'standard', extract: '' }, 'test')).toBeNull();
    expect(normalizeWikipediaSummary(null, 'test')).toBeNull();
  });
});
