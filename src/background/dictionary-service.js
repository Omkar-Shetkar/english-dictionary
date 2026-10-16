/**
 * Free Dictionary API Client and Response Normalizer.
 * Queries https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 */

export const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
export const FETCH_TIMEOUT_MS = 6000;

/**
 * Normalizes raw API response payload into a standardized DictionaryEntry structure.
 * @param {Array<object>} data
 * @param {string} fallbackWord
 * @returns {import('../common/types.js').DictionaryEntry|null}
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
  // Scan all entries and their phonetics arrays for a valid audio link
  for (const entry of data) {
    if (Array.isArray(entry.phonetics)) {
      const audioItem = entry.phonetics.find((p) => {
        if (!p || typeof p.audio !== 'string') return false;
        const cleaned = p.audio.trim();
        return cleaned.length > 0 && (cleaned.startsWith('http://') || cleaned.startsWith('https://'));
      });
      if (audioItem) {
        audioUrl = audioItem.audio.trim();
        break;
      }
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
          // Check if part of speech already exists in meanings; if so, append definitions
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
 * Fetches dictionary entry for a given sanitized word.
 * @param {string} word
 * @param {typeof fetch} [fetchFn] - Custom fetch for testing or standard globalThis.fetch
 * @returns {Promise<import('../common/types.js').LookupResult>}
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
  const url = `${DICTIONARY_API_BASE}/${encodeURIComponent(cleanWord)}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    : null;

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
      if (!entry || entry.meanings.length === 0) {
        return {
          status: 'not_found',
          entry: null,
          errorMessage: `No definitions found for "${cleanWord}". Check spelling.`
        };
      }
      return {
        status: 'success',
        entry,
        errorMessage: null
      };
    }

    if (response.status === 404) {
      return {
        status: 'not_found',
        entry: null,
        errorMessage: `No definitions found for "${cleanWord}". Check spelling.`
      };
    }

    return {
      status: 'error',
      entry: null,
      errorMessage: `Dictionary service returned status ${response.status}.`
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    const isAbort = err && (err.name === 'AbortError' || err.message?.includes('aborted'));
    if (isAbort) {
      return {
        status: 'network_error',
        entry: null,
        errorMessage: 'Connection timed out. Please check your internet connection.'
      };
    }

    return {
      status: 'network_error',
      entry: null,
      errorMessage: 'Unable to connect to dictionary service. Please check your internet connection.'
    };
  }
}
