import { describe, it, expect, vi } from 'vitest';
import {
  normalizeDictionaryResponse,
  normalizeWiktionaryResponse,
  lookupWord,
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
});
