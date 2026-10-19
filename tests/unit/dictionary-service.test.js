import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeDictionaryResponse,
  normalizeWiktionaryResponse,
  lookupWord,
  lookupDomainTerm,
  clearCache,
  cleanHtml
} from '../../src/background/dictionary-service.js';

describe('dictionary-service', () => {
  const mockApiResponse = [
    {
      word: 'ephemeral',
      phonetic: '/əˈfɛm(ə)ɹəl/',
      phonetics: [
        { text: '/əˈfɛm(ə)ɹəl/' },
        {
          audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3',
          sourceUrl: 'https://commons.wikimedia.org'
        }
      ],
      meanings: [
        {
          partOfSpeech: 'adjective',
          definitions: [
            {
              definition: 'Lasting for a very short time.',
              example: 'fashions are ephemeral: new ones regularly drive out the old',
              synonyms: ['transitory', 'fleeting'],
              antonyms: ['permanent']
            }
          ]
        },
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'An ephemeral plant or insect.',
              example: null,
              synonyms: []
            }
          ]
        }
      ]
    }
  ];

  it('correctly normalizes a rich API response', () => {
    const entry = normalizeDictionaryResponse(mockApiResponse, 'ephemeral');
    expect(entry).not.toBeNull();
    expect(entry.word).toBe('ephemeral');
    expect(entry.phonetic).toBe('/əˈfɛm(ə)ɹəl/');
    expect(entry.audioUrl).toBe('https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3');
    expect(entry.meanings.length).toBe(2);

    const adj = entry.meanings[0];
    expect(adj.partOfSpeech).toBe('adjective');
    expect(adj.definitions[0].definition).toBe('Lasting for a very short time.');
    expect(adj.definitions[0].example).toBe('fashions are ephemeral: new ones regularly drive out the old');
    expect(adj.definitions[0].synonyms).toContain('transitory');

    const noun = entry.meanings[1];
    expect(noun.partOfSpeech).toBe('noun');
    expect(noun.definitions[0].definition).toBe('An ephemeral plant or insect.');
  });

  it('normalizes protocol-relative audio URLs with https:', () => {
    const raw = [
      {
        word: 'test',
        phonetics: [
          { audio: '//ssl.gstatic.com/dictionary/static/sounds/20200429/test--_gb_1.mp3' }
        ],
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A procedure intended to establish quality.' }]
          }
        ]
      }
    ];

    const entry = normalizeDictionaryResponse(raw, 'test');
    expect(entry.audioUrl).toBe('https://ssl.gstatic.com/dictionary/static/sounds/20200429/test--_gb_1.mp3');
  });

  it('normalizes Wiktionary REST API definitions and cleans HTML', () => {
    const mockWiktionary = {
      en: [
        {
          partOfSpeech: 'Verb',
          definitions: [
            {
              definition: '<a href="/wiki/present">present</a> participle of run',
              examples: ['He was <mark>running</mark> fast.']
            }
          ]
        }
      ]
    };

    const entry = normalizeWiktionaryResponse(mockWiktionary, 'running');
    expect(entry).not.toBeNull();
    expect(entry.word).toBe('running');
    expect(entry.meanings[0].partOfSpeech).toBe('Verb');
    expect(entry.meanings[0].definitions[0].definition).toBe('present participle of run');
    expect(entry.meanings[0].definitions[0].example).toBe('He was running fast.');
  });

  it('cleanHtml strips tags and decodes common entities', () => {
    expect(cleanHtml('<b>bold</b> &amp; <i>italic</i>')).toBe('bold & italic');
    expect(cleanHtml('&quot;quoted&#39;')).toBe('"quoted\'');
  });

  it('returns null for empty or invalid array payloads', () => {
    expect(normalizeDictionaryResponse([], 'empty')).toBeNull();
    expect(normalizeDictionaryResponse(null, 'null')).toBeNull();
  });

  it('lookupWord handles 200 OK responses from primary provider', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockApiResponse
    });

    const result = await lookupWord('ephemeral', mockFetch);
    expect(result.status).toBe('success');
    expect(result.entry.word).toBe('ephemeral');
    expect(result.errorMessage).toBeNull();
  });

  it('lookupWord falls back to Wiktionary when primary returns 404', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('api.dictionaryapi.dev')) {
        return { status: 404, json: async () => ({}) };
      }
      if (url.includes('wiktionary.org')) {
        return {
          status: 200,
          json: async () => ({
            en: [
              {
                partOfSpeech: 'verb',
                definitions: [{ definition: 'To test something' }]
              }
            ]
          })
        };
      }
      return { status: 500 };
    });

    const result = await lookupWord('fallbacktest', mockFetch);
    expect(result.status).toBe('success');
    expect(result.entry.word).toBe('fallbacktest');
    expect(result.entry.meanings[0].definitions[0].definition).toBe('To test something');
  });

  it('lookupWord reports not_found when both providers fail', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 404,
      json: async () => ({})
    });

    const result = await lookupWord('totallynonexistent123', mockFetch);
    expect(result.status).toBe('not_found');
    expect(result.entry).toBeNull();
    expect(result.errorMessage).toContain('No definitions found for "totallynonexistent123"');
  });

  describe('lookupDomainTerm', () => {
    beforeEach(() => {
      clearCache();
    });

    it('routes uppercase acronym "AI" to Wiktionary & Wikipedia concurrently', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('wiktionary.org/api/rest_v1/page/definition/AI')) {
          return {
            status: 200,
            json: async () => ({
              en: [
                {
                  partOfSpeech: 'Noun',
                  definitions: [
                    { definition: '<p>(computing) <a href="/wiki/Artificial_intelligence">Artificial intelligence</a>.</p>' }
                  ]
                }
              ]
            })
          };
        }
        if (url.includes('wikipedia.org/api/rest_v1/page/summary/AI')) {
          return {
            status: 200,
            json: async () => ({
              type: 'standard',
              title: 'Artificial intelligence',
              description: 'Field of computer science',
              extract: 'Artificial intelligence (AI) is intelligence exhibited by machines.'
            })
          };
        }
        if (url.includes('api.dictionaryapi.dev/api/v2/entries/en/ai')) {
          return {
            status: 200,
            json: async () => [
              {
                word: 'ai',
                phonetics: [{ audio: 'https://example.com/audio/ai.mp3' }],
                meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A three-toed sloth.' }] }]
              }
            ]
          };
        }
        return { status: 404 };
      });

      const res = await lookupDomainTerm({ term: 'AI', isUppercase: true, wordCount: 1 }, mockFetch);
      expect(res.status).toBe('success');
      expect(res.entry.word).toBe('AI');
      expect(res.entry.isAcronym).toBe(true);
      expect(res.entry.acronymExpansion).toBe('Artificial Intelligence');
      expect(res.entry.meanings[0].domain).toBe('Computing');
      expect(res.entry.audioUrl).toBe('https://example.com/audio/ai.mp3');
      expect(res.entry.encyclopedicSummary).toContain('intelligence exhibited by machines');
      expect(res.entry.generalMeanings.length).toBeGreaterThan(0);
      expect(res.entry.generalMeanings[0].definitions[0].definition).toContain('three-toed sloth');
    });

    it('routes multi-word phrase "machine learning" to Wikipedia Summary', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes('wikipedia.org/api/rest_v1/page/summary/machine_learning')) {
          return {
            status: 200,
            json: async () => ({
              type: 'standard',
              title: 'Machine learning',
              description: 'Field of computer science',
              extract: 'Machine learning is a field of study in artificial intelligence.'
            })
          };
        }
        return { status: 404 };
      });

      const res = await lookupDomainTerm({ term: 'machine learning', isUppercase: false, wordCount: 2 }, mockFetch);
      expect(res.status).toBe('success');
      expect(res.entry.word).toBe('Machine learning');
      expect(res.entry.meanings[0].domain).toBe('Computing');
      expect(res.entry.encyclopedicSummary).toContain('field of study in artificial intelligence');
    });

    it('serves repeated lookups directly from in-memory cache', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          type: 'standard',
          title: 'Quantum computing',
          description: 'Area of computer science',
          extract: 'Quantum computing is a rapidly-emerging technology.'
        })
      });

      const res1 = await lookupDomainTerm({ term: 'Quantum computing', wordCount: 2 }, mockFetch);
      expect(res1.status).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Wikipedia summary + Wiktionary

      // Second call should hit in-memory cache without invoking fetchFn again
      const res2 = await lookupDomainTerm({ term: 'Quantum computing', wordCount: 2 }, mockFetch);
      expect(res2.status).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
