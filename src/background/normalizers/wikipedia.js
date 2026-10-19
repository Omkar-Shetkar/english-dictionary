/**
 * Wikipedia REST API Summary Normalizer.
 * Endpoint: https://en.wikipedia.org/api/rest_v1/page/summary/{title}
 *
 * Capabilities:
 * - Extracts clean encyclopedic lead summaries (extract).
 * - Extracts domain subtitle (description) and classifies field.
 * - Extracts canonical article link for deep reading.
 * - Detects acronym expansions in summaries (e.g., "Artificial intelligence (AI)...").
 */

import { classifyDomain, extractAcronymExpansion } from '../../common/domain-detector.js';

/**
 * Normalizes Wikipedia REST API Summary response payload into DomainDictionaryEntry structure.
 * @param {object} data - Raw JSON from Wikipedia summary endpoint
 * @param {string} queriedTerm - The term requested by user
 * @returns {object|null}
 */
export function normalizeWikipediaSummary(data, queriedTerm) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Reject disambiguation pages or empty extracts
  if (data.type === 'disambiguation' || !data.extract || data.extract.trim().length < 10) {
    return null;
  }

  const word = data.title || queriedTerm || 'unknown';
  const extract = data.extract.trim();
  const description = data.description ? data.description.trim() : '';

  // Classify domain from description and extract
  const domain = classifyDomain(extract, [description]);

  // Check if summary defines an acronym, e.g., "Artificial intelligence (AI)"
  let acronymExpansion = null;
  let isAcronym = false;

  if (queriedTerm && queriedTerm === queriedTerm.toUpperCase() && queriedTerm.length >= 2 && queriedTerm.length <= 6) {
    isAcronym = true;
    if (data.title && !data.title.includes('(')) {
      acronymExpansion = data.title;
    }
  }

  if (!acronymExpansion) {
    acronymExpansion = extractAcronymExpansion(queriedTerm, extract);
    if (acronymExpansion) isAcronym = true;
  }

  const referenceUrl = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page
    ? data.content_urls.desktop.page
    : `https://en.wikipedia.org/wiki/${encodeURIComponent(word.replace(/\s+/g, '_'))}`;

  const meanings = [
    {
      domain,
      partOfSpeech: description ? description.toLowerCase() : 'concept',
      definitions: [
        {
          definition: extract,
          example: null,
          synonyms: [],
          antonyms: []
        }
      ]
    }
  ];

  return {
    word,
    isAcronym,
    acronymExpansion,
    meanings,
    generalMeanings: [],
    phonetic: null,
    audioUrl: null,
    encyclopedicSummary: extract,
    referenceUrl,
    source: 'wikipedia'
  };
}
