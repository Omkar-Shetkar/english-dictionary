import { describe, it, expect, vi } from 'vitest';
import { normalizeDictionaryResponse, lookupWord } from '../../src/background/dictionary-service.js';

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

  it('handles entries with missing audio or phonetic text gracefully', () => {
    const minimalData = [
      {
        word: 'testword',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A definition for testing.' }]
          }
        ]
      }
    ];

    const entry = normalizeDictionaryResponse(minimalData, 'testword');
    expect(entry).not.toBeNull();
    expect(entry.word).toBe('testword');
    expect(entry.phonetic).toBeNull();
    expect(entry.audioUrl).toBeNull();
    expect(entry.meanings.length).toBe(1);
    expect(entry.meanings[0].definitions[0].definition).toBe('A definition for testing.');
  });

  it('returns null for empty or invalid array payloads', () => {
    expect(normalizeDictionaryResponse([], 'empty')).toBeNull();
    expect(normalizeDictionaryResponse(null, 'null')).toBeNull();
  });

  it('lookupWord handles 200 OK responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockApiResponse
    });

    const result = await lookupWord('ephemeral', mockFetch);
    expect(result.status).toBe('success');
    expect(result.entry.word).toBe('ephemeral');
    expect(result.errorMessage).toBeNull();
  });

  it('lookupWord handles 404 Not Found responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 404,
      json: async () => ({ title: 'No Definitions Found' })
    });

    const result = await lookupWord('nonexistentword123', mockFetch);
    expect(result.status).toBe('not_found');
    expect(result.entry).toBeNull();
    expect(result.errorMessage).toContain('No definitions found for "nonexistentword123"');
  });

  it('lookupWord handles network disconnection or fetch errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const result = await lookupWord('anyword', mockFetch);
    expect(result.status).toBe('network_error');
    expect(result.entry).toBeNull();
    expect(result.errorMessage).toContain('Unable to connect to dictionary service');
  });
});
