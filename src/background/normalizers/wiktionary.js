/**
 * Wiktionary REST API Normalizer.
 * Endpoint: https://en.wiktionary.org/api/rest_v1/page/definition/{term}
 *
 * Capabilities:
 * - Case-sensitive lookup parsing (e.g. "AI" vs "ai", "RAM" vs "ram").
 * - Strips HTML markup cleanly.
 * - Extracts acronym expansions and assigns domain category badges.
 * - Segregates domain/acronym meanings from general lexical meanings for stacked disambiguation.
 */

import {
  classifyDomain,
  extractContextTags,
  extractAcronymExpansion,
  DOMAINS
} from '../../common/domain-detector.js';

/**
 * Strips HTML formatting from definition strings.
 * @param {string} html
 * @returns {string}
 */
export function cleanHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Normalizes Wiktionary REST response payload into DomainDictionaryEntry structure.
 * @param {object} data - Raw JSON from Wiktionary REST API
 * @param {string} queriedTerm - The term requested by user (preserving casing)
 * @returns {object|null}
 */
export function normalizeWiktionaryPayload(data, queriedTerm) {
  if (!data || !data.en || !Array.isArray(data.en)) {
    return null;
  }

  const word = queriedTerm || 'unknown';
  let isAcronym = false;
  let acronymExpansion = null;

  const domainMeaningsMap = new Map();
  const generalMeaningsMap = new Map();

  for (const item of data.en) {
    const originalPos = item.partOfSpeech || 'general';
    const rawPos = originalPos.toLowerCase();
    const isAbbrevPos = rawPos.includes('abbreviation') || rawPos.includes('initialism') || rawPos.includes('acronym');

    if (Array.isArray(item.definitions)) {
      for (const d of item.definitions) {
        const text = cleanHtml(d.definition);
        if (!text || text.length < 2) continue;

        const contextTags = extractContextTags(text);
        const domain = classifyDomain(text, [rawPos, ...contextTags]);

        // Check if definition expands an acronym
        const expansion = extractAcronymExpansion(word, text);
        if (expansion && !acronymExpansion) {
          acronymExpansion = expansion;
          isAcronym = true;
        } else if (isAbbrevPos || /\b(initialism|acronym|abbreviation)\b/i.test(text)) {
          isAcronym = true;
        }

        const example = Array.isArray(d.examples) && d.examples.length > 0
          ? cleanHtml(d.examples[0])
          : null;

        const defObj = {
          definition: text,
          example,
          synonyms: [],
          antonyms: []
        };

        const targetMap = (domain !== DOMAINS.GENERAL || isAbbrevPos)
          ? domainMeaningsMap
          : generalMeaningsMap;

        const key = `${domain}::${rawPos}`;
        if (!targetMap.has(key)) {
          targetMap.set(key, {
            domain,
            partOfSpeech: originalPos,
            definitions: []
          });
        }
        targetMap.get(key).definitions.push(defObj);
      }
    }
  }

  const meanings = Array.from(domainMeaningsMap.values());
  const generalMeanings = Array.from(generalMeaningsMap.values());

  if (meanings.length === 0 && generalMeanings.length === 0) {
    return null;
  }

  // If there are no domain-specific meanings, move general meanings into primary meanings
  const primaryMeanings = meanings.length > 0 ? meanings : generalMeanings;
  const secondaryMeanings = meanings.length > 0 ? generalMeanings : [];

  return {
    word,
    isAcronym,
    acronymExpansion,
    meanings: primaryMeanings,
    generalMeanings: secondaryMeanings,
    phonetic: null,
    audioUrl: null,
    encyclopedicSummary: null,
    referenceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    source: 'wiktionary'
  };
}
