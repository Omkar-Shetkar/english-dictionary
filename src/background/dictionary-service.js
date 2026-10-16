/**
 * Dictionary API Client with Dual-Provider Fallback & In-Memory Cache.
 * Primary: Free Dictionary API (https://api.dictionaryapi.dev)
 * Fallback: Wiktionary REST API (https://en.wiktionary.org)
 */

export const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
export const WIKTIONARY_API_BASE = 'https://en.wiktionary.org/api/rest_v1/page/definition';
export const FETCH_TIMEOUT_MS = 4000;

// In-memory cache for fast repeated lookups (max 100 items)
const lookupCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Normalizes raw Free Dictionary API response payload.
 * @param {Array<object>} data
 * @param {string} fallbackWord
 * @returns {object|null}
 */
export function normalizeDictionaryResponse(data, fallbackWord = '') {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const primary = data[0];
  const word = primary.word || fallbackWord;

  // 1. Resolve Phonetics (text)
  let phonetic = primary.phonetic || null;
  if (!phonetic && Array.isArray(primary.phonetics)) {
    const itemWithText = primary.phonetics.find((p) => p && typeof p.text === 'string' && p.text.trim().length > 0);
    if (itemWithText) {
      phonetic = itemWithText.text.trim();
    }
  }

  // 2. Resolve Audio URL
  let audioUrl = null;
  for (const entry of data) {
    if (Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics) {
        if (!p || typeof p.audio !== 'string') continue;
        let url = p.audio.trim();
        if (url.startsWith('//')) {
          url = 'https:' + url;
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          audioUrl = url;
          break;
        }
      }
      if (audioUrl) break;
    }
  }

  // 3. Resolve Meanings
  const meanings = [];
  for (const entry of data) {
    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        if (!m || !m.partOfSpeech) continue;

        const partOfSpeech = m.partOfSpeech;
        const definitions = [];

        if (Array.isArray(m.definitions)) {
          for (const d of m.definitions) {
            if (!d || !d.definition) continue;
            definitions.push({
              definition: d.definition.trim(),
              example: d.example ? d.example.trim() : null,
              synonyms: Array.isArray(d.synonyms) ? d.synonyms.slice(0, 5) : [],
              antonyms: Array.isArray(d.antonyms) ? d.antonyms.slice(0, 5) : []
            });
          }
        }

        if (definitions.length > 0) {
          const existing = meanings.find((item) => item.partOfSpeech.toLowerCase() === partOfSpeech.toLowerCase());
          if (existing) {
            existing.definitions.push(...definitions);
          } else {
            meanings.push({
              partOfSpeech,
              definitions
            });
          }
        }
      }
    }
  }

  return {
    word,
    phonetic,
    audioUrl,
    meanings
  };
}

/**
 * Strips HTML formatting from Wiktionary definition strings.
 * @param {string} html
 * @returns {string}
 */
export function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Normalizes Wiktionary REST API response into standardized DictionaryEntry structure.
 * @param {object} data
 * @param {string} word
 * @returns {object|null}
 */
export function normalizeWiktionaryResponse(data, word) {
  if (!data || !data.en || !Array.isArray(data.en)) {
    return null;
  }

  const meanings = [];
  for (const item of data.en) {
    const partOfSpeech = item.partOfSpeech || 'general';
    const definitions = [];

    if (Array.isArray(item.definitions)) {
      for (const d of item.definitions) {
        const text = cleanHtml(d.definition);
        if (text && text.length > 2) {
          const ex = Array.isArray(d.examples) && d.examples.length > 0
            ? cleanHtml(d.examples[0])
            : null;
          definitions.push({
            definition: text,
            example: ex,
            synonyms: [],
            antonyms: []
          });
        }
      }
    }

    if (definitions.length > 0) {
      meanings.push({
        partOfSpeech,
        definitions
      });
    }
  }

  if (meanings.length === 0) {
    return null;
  }

  return {
    word,
    phonetic: null,
    audioUrl: null,
    meanings
  };
}

/**
 * Fetches dictionary entry with Wiktionary fallback and timeout.
 * @param {string} word
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<object>}
 */
export async function lookupWord(word, fetchFn = globalThis.fetch) {
  if (!word || typeof word !== 'string') {
    return {
      status: 'error',
      entry: null,
      errorMessage: 'Invalid word requested.'
    };
  }

  const cleanWord = word.trim().toLowerCase();

  // Check cache first
  if (lookupCache.has(cleanWord)) {
    return lookupCache.get(cleanWord);
  }

  // 1. Primary: Free Dictionary API
  const primaryResult = await fetchFromFreeDictionary(cleanWord, fetchFn);
  if (primaryResult.status === 'success') {
    cacheResult(cleanWord, primaryResult);
    return primaryResult;
  }

  // 2. Fallback: Wiktionary REST API (for inflections, rare words, or timeouts)
  console.info(`[Dictionary Addon] Primary lookup for "${cleanWord}" unsuccessful (${primaryResult.status}); checking Wiktionary fallback...`);
  const fallbackResult = await fetchFromWiktionary(cleanWord, fetchFn);
  if (fallbackResult.status === 'success') {
    cacheResult(cleanWord, fallbackResult);
    return fallbackResult;
  }

  // If both fail
  const finalResult = {
    status: 'not_found',
    entry: null,
    errorMessage: `No definitions found for "${cleanWord}". Check spelling.`
  };
  cacheResult(cleanWord, finalResult);
  return finalResult;
}

function cacheResult(word, result) {
  if (lookupCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = lookupCache.keys().next().value;
    lookupCache.delete(oldestKey);
  }
  lookupCache.set(word, result);
}

async function fetchFromFreeDictionary(cleanWord, fetchFn) {
  const url = `${DICTIONARY_API_BASE}/${encodeURIComponent(cleanWord)}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.status === 200) {
      const data = await response.json();
      const entry = normalizeDictionaryResponse(data, cleanWord);
      if (entry && entry.meanings.length > 0) {
        return { status: 'success', entry, errorMessage: null };
      }
    }

    if (response.status === 404) {
      return { status: 'not_found', entry: null };
    }

    return { status: 'error', entry: null };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { status: 'network_error', entry: null };
  }
}

async function fetchFromWiktionary(cleanWord, fetchFn) {
  const url = `${WIKTIONARY_API_BASE}/${encodeURIComponent(cleanWord)}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.status === 200) {
      const data = await response.json();
      const entry = normalizeWiktionaryResponse(data, cleanWord);
      if (entry && entry.meanings.length > 0) {
        return { status: 'success', entry, errorMessage: null };
      }
    }

    return { status: 'not_found', entry: null };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { status: 'network_error', entry: null };
  }
}
