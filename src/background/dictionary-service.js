/**
 * Multi-Provider Dictionary & Domain Term Service with Smart Query Routing.
 *
 * Providers:
 * 1. Wiktionary REST API (https://en.wiktionary.org/api/rest_v1/page/definition/{term})
 *    - Case-sensitive acronym expansions (e.g. "AI" -> "Artificial Intelligence").
 *    - Domain-specific academic/technical definitions with field tags.
 * 2. Wikipedia Summary REST API (https://en.wikipedia.org/api/rest_v1/page/summary/{title})
 *    - Encyclopedic summaries for historical eras, scientific theories, multi-word terms.
 * 3. Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/{word})
 *    - General lexical English vocabulary, phonetic transcriptions, spoken audio MP3s.
 *
 * Latency Protection:
 * - Smart case-sensitive routing (routes acronyms directly, bypassing 404 delays).
 * - Concurrent provider dispatch for multi-word and acronym queries.
 * - Strict 2,500ms AbortController timeout per fetch.
 * - In-memory session cache (max 100 entries).
 */

import { normalizeWiktionaryPayload, cleanHtml as wiktionaryCleanHtml } from './normalizers/wiktionary.js';
import { normalizeWikipediaSummary } from './normalizers/wikipedia.js';
import { generateCandidatePhrases } from './phrase-normalizer.js';
import { getRelatedIdioms } from './idiom-index.js';

export const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
export const WIKTIONARY_API_BASE = 'https://en.wiktionary.org/api/rest_v1/page/definition';
export const WIKIPEDIA_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';
export const FETCH_TIMEOUT_MS = 2500;

// In-memory cache for fast repeated lookups (max 100 items)
const lookupCache = new Map();
const MAX_CACHE_SIZE = 100;

export function cleanHtml(html) {
  return wiktionaryCleanHtml(html);
}

export function clearCache() {
  lookupCache.clear();
}

/**
 * Normalizes raw Free Dictionary API response payload (legacy compatibility).
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
              domain: 'General',
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
    isAcronym: false,
    acronymExpansion: null,
    phonetic,
    audioUrl,
    meanings,
    generalMeanings: [],
    encyclopedicSummary: null,
    referenceUrl: null,
    source: 'freedictionary'
  };
}

/**
 * Normalizes Wiktionary REST response (legacy wrapper).
 * @param {object} data
 * @param {string} word
 * @returns {object|null}
 */
export function normalizeWiktionaryResponse(data, word) {
  return normalizeWiktionaryPayload(data, word);
}

/**
 * Central router for domain term lookups with zero-latency concurrent dispatch.
 * @param {{
 *   term: string,
 *   rawText?: string,
 *   isUppercase?: boolean,
 *   wordCount?: number
 * }} request
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<{
 *   status: 'success' | 'not_found' | 'network_error' | 'error',
 *   entry: object|null,
 *   errorMessage: string|null
 * }>}
 */
export async function lookupDomainTerm(request, fetchFn = globalThis.fetch) {
  if (!request || !request.term || typeof request.term !== 'string') {
    return {
      status: 'error',
      entry: null,
      errorMessage: 'Invalid word or term requested.'
    };
  }

  const term = request.term.trim();
  const cacheKey = term;

  if (lookupCache.has(cacheKey)) {
    return lookupCache.get(cacheKey);
  }

  const isUppercase = request.isUppercase ?? (term === term.toUpperCase() && /[A-Z]/.test(term));
  const wordCount = request.wordCount ?? term.split(/\s+/).length;

  let result = null;

  // ROUTE 1: Uppercase / Acronym (e.g., "AI", "RAM", "DNA", "ROI", "GDP")
  if (isUppercase && wordCount === 1) {
    result = await handleAcronymLookup(term, fetchFn);
  }
  // ROUTE 2: Multi-Word Compound Phrase (2 to 4 words, e.g., "machine learning", "black hole")
  else if (wordCount > 1) {
    result = await handleMultiWordLookup(term, fetchFn);
  }
  // ROUTE 3: Standard Single Word (e.g., "ephemeral", "polymorphism", "Renaissance")
  else {
    result = await handleStandardWordLookup(term, fetchFn);
  }

  if (result.status === 'success' || result.status === 'not_found') {
    cacheResult(cacheKey, result);
  }

  return result;
}

/**
 * Backwards-compatible lookupWord entry point.
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

  const trimmed = word.trim();
  const isUpper = trimmed.length <= 6 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);

  return lookupDomainTerm(
    {
      term: trimmed,
      rawText: word,
      isUppercase: isUpper,
      wordCount: trimmed.split(/\s+/).length
    },
    fetchFn
  );
}

/**
 * Concurrent lookup for uppercase acronyms:
 * Dispatches to Wiktionary (case-sensitive) and Wikipedia Summary concurrently.
 */
async function handleAcronymLookup(term, fetchFn) {
  const [wiktionaryRes, wikiSummaryRes, freeDictRes] = await Promise.allSettled([
    fetchFromWiktionary(term, fetchFn),
    fetchFromWikipediaSummary(term, fetchFn),
    fetchFromFreeDictionary(term.toLowerCase(), fetchFn)
  ]);

  const wiktionary = wiktionaryRes.status === 'fulfilled' ? wiktionaryRes.value : null;
  const wikiSummary = wikiSummaryRes.status === 'fulfilled' ? wikiSummaryRes.value : null;
  const freeDict = freeDictRes.status === 'fulfilled' ? freeDictRes.value : null;

  // 1. If Wiktionary returned entries for the uppercase acronym
  if (wiktionary && wiktionary.status === 'success' && wiktionary.entry) {
    const entry = { ...wiktionary.entry };

    // If Free Dictionary has audio, attach it
    if (freeDict && freeDict.status === 'success' && freeDict.entry) {
      if (!entry.audioUrl && freeDict.entry.audioUrl) {
        entry.audioUrl = freeDict.entry.audioUrl;
      }
      if (!entry.phonetic && freeDict.entry.phonetic) {
        entry.phonetic = freeDict.entry.phonetic;
      }

      // If Wiktionary lacked general meanings, populate general meanings from Free Dictionary
      if ((!entry.generalMeanings || entry.generalMeanings.length === 0) && freeDict.entry.meanings.length > 0) {
        entry.generalMeanings = freeDict.entry.meanings;
      }
    }

    // Attach Wikipedia encyclopedic summary if available
    if (wikiSummary && wikiSummary.status === 'success' && wikiSummary.entry) {
      if (!entry.acronymExpansion && wikiSummary.entry.acronymExpansion) {
        entry.acronymExpansion = wikiSummary.entry.acronymExpansion;
        entry.isAcronym = true;
      }
      entry.encyclopedicSummary = wikiSummary.entry.encyclopedicSummary;
    }

    return { status: 'success', entry, errorMessage: null };
  }

  // 2. If Wikipedia Summary resolved the acronym
  if (wikiSummary && wikiSummary.status === 'success' && wikiSummary.entry) {
    const entry = { ...wikiSummary.entry };
    if (freeDict && freeDict.status === 'success' && freeDict.entry) {
      entry.audioUrl = freeDict.entry.audioUrl;
      entry.phonetic = freeDict.entry.phonetic;
      entry.generalMeanings = freeDict.entry.meanings;
    }
    return { status: 'success', entry, errorMessage: null };
  }

  // 3. Fallback to Free Dictionary
  if (freeDict && freeDict.status === 'success' && freeDict.entry) {
    return freeDict;
  }

  return {
    status: 'not_found',
    entry: null,
    errorMessage: `No definitions found for "${term}". Check spelling.`
  };
}

/**
 * Concurrent lookup for multi-word phrases and idioms (2 to 8 words):
 * Evaluates candidate queries generated by phrase lemmatizer (exact, pronoun-normalized, verb-lemmatized).
 * Concurrently queries Wiktionary, Free Dictionary, and Wikipedia Summary.
 */
async function handleMultiWordLookup(term, fetchFn) {
  const candidates = generateCandidatePhrases(term);
  if (!candidates.includes(term.toLowerCase())) {
    candidates.unshift(term.toLowerCase());
  }

  for (const candidate of candidates) {
    const isTransformed = candidate.toLowerCase() !== term.toLowerCase();

    const [wiktionaryRes, wikiSummaryRes] = await Promise.allSettled([
      fetchFromWiktionary(candidate, fetchFn),
      fetchFromWikipediaSummary(candidate, fetchFn)
    ]);

    const wiktionary = wiktionaryRes.status === 'fulfilled' ? wiktionaryRes.value : null;
    const wikiSummary = wikiSummaryRes.status === 'fulfilled' ? wikiSummaryRes.value : null;

    // 1. Wiktionary Match (Primary for Idioms, Proverbs, Phrases, Phrasal Verbs)
    if (wiktionary && wiktionary.status === 'success' && wiktionary.entry) {
      const entry = { ...wiktionary.entry };
      if (isTransformed) {
        entry.canonicalForm = candidate;
        entry.matchedSurfaceForm = term;
      }
      if (wikiSummary && wikiSummary.status === 'success' && wikiSummary.entry) {
        if (!entry.encyclopedicSummary && wikiSummary.entry.encyclopedicSummary) {
          entry.encyclopedicSummary = wikiSummary.entry.encyclopedicSummary;
        }
        if (!entry.origin && wikiSummary.entry.origin) {
          entry.origin = wikiSummary.entry.origin;
        }
      }
      return { status: 'success', entry, errorMessage: null };
    }

    // 2. Wikipedia Summary Match (e.g., "machine learning", "Achilles' heel")
    if (wikiSummary && wikiSummary.status === 'success' && wikiSummary.entry) {
      const entry = { ...wikiSummary.entry };
      if (isTransformed) {
        entry.canonicalForm = candidate;
        entry.matchedSurfaceForm = term;
      }
      return { status: 'success', entry, errorMessage: null };
    }

    // 3. Free Dictionary Fallback (e.g., common phrasal verbs "give up", "look forward to")
    const freeDictRes = await fetchFromFreeDictionary(candidate, fetchFn);
    if (freeDictRes && freeDictRes.status === 'success' && freeDictRes.entry) {
      const entry = { ...freeDictRes.entry };
      entry.expressionType = 'phrasal_verb';
      for (const m of entry.meanings) {
        if (!m.domain || m.domain === 'General') {
          m.domain = 'Phrasal Verb';
        }
      }
      if (isTransformed) {
        entry.canonicalForm = candidate;
        entry.matchedSurfaceForm = term;
      }
      return { status: 'success', entry, errorMessage: null };
    }
  }

  return {
    status: 'not_found',
    entry: null,
    errorMessage: `No definitions found for "${term}". Check spelling.`
  };
}

/**
 * Standard single-word lookup:
 * Free Dictionary API -> Wiktionary -> Wikipedia Summary.
 * Attaches related idioms if available (FR-009).
 */
async function handleStandardWordLookup(term, fetchFn) {
  const cleanWord = term.toLowerCase();
  let result = null;

  // 1. Primary: Free Dictionary API
  const primaryResult = await fetchFromFreeDictionary(cleanWord, fetchFn);
  if (primaryResult.status === 'success' && primaryResult.entry) {
    result = primaryResult;
  } else {
    // 2. Fallback: Wiktionary REST API
    const wiktionaryResult = await fetchFromWiktionary(term, fetchFn);
    if (wiktionaryResult.status === 'success' && wiktionaryResult.entry) {
      result = wiktionaryResult;
    } else {
      // 3. Fallback: Wikipedia Summary REST API
      const wikiResult = await fetchFromWikipediaSummary(term, fetchFn);
      if (wikiResult.status === 'success' && wikiResult.entry) {
        result = wikiResult;
      }
    }
  }

  if (result && result.entry) {
    const related = getRelatedIdioms(cleanWord);
    if (related && related.length > 0) {
      result.entry.relatedIdioms = related;
    }
    return result;
  }

  return {
    status: 'not_found',
    entry: null,
    errorMessage: `No definitions found for "${term}". Check spelling.`
  };
}

function cacheResult(key, result) {
  if (lookupCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = lookupCache.keys().next().value;
    lookupCache.delete(oldestKey);
  }
  lookupCache.set(key, result);
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
      return { status: 'not_found', entry: null, errorMessage: 'Word not found' };
    }

    return { status: 'error', entry: null, errorMessage: 'Service error' };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { status: 'network_error', entry: null, errorMessage: 'Network error' };
  }
}

async function fetchFromWiktionary(term, fetchFn) {
  const normalizedTerm = term.trim().replace(/\s+/g, '_');
  const url = `${WIKTIONARY_API_BASE}/${encodeURIComponent(normalizedTerm)}`;
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
      const entry = normalizeWiktionaryPayload(data, term);
      if (entry && (entry.meanings.length > 0 || entry.generalMeanings.length > 0)) {
        return { status: 'success', entry, errorMessage: null };
      }
    }

    return { status: 'not_found', entry: null, errorMessage: 'Term not found in Wiktionary' };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { status: 'network_error', entry: null, errorMessage: 'Network error' };
  }
}

async function fetchFromWikipediaSummary(title, fetchFn) {
  const url = `${WIKIPEDIA_SUMMARY_BASE}/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
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
      const entry = normalizeWikipediaSummary(data, title);
      if (entry && entry.meanings.length > 0) {
        return { status: 'success', entry, errorMessage: null };
      }
    }

    return { status: 'not_found', entry: null, errorMessage: 'Topic not found in Wikipedia' };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return { status: 'network_error', entry: null, errorMessage: 'Network error' };
  }
}
