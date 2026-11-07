/**
 * Phrase Normalizer and Heuristic Lemmatizer.
 *
 * Responsibilities:
 * - Maps inflected/conjugated verbs in multi-word phrases to their canonical lemma (infinitive).
 *   Example: "bit the bullet" -> "bite the bullet", "broken the ice" -> "break the ice".
 * - Normalizes personalized pronouns to canonical template wildcards ("one's" / "someone's" / "someone").
 *   Example: "pulling my leg" -> "pull someone's leg", "lost his cool" -> "lose one's cool".
 * - Generates prioritized candidate queries for lexical lookup cascade.
 */

// Irregular verb inflection map: inflected form -> base lemma
const IRREGULAR_VERB_MAP = new Map([
  // bite
  ['bit', 'bite'], ['bitten', 'bite'], ['biting', 'bite'], ['bites', 'bite'],
  // break
  ['broke', 'break'], ['broken', 'break'], ['breaking', 'break'], ['breaks', 'break'],
  // spill
  ['spilled', 'spill'], ['spilt', 'spill'], ['spilling', 'spill'], ['spills', 'spill'],
  // kick
  ['kicked', 'kick'], ['kicking', 'kick'], ['kicks', 'kick'],
  // pull
  ['pulled', 'pull'], ['pulling', 'pull'], ['pulls', 'pull'],
  // blow
  ['blew', 'blow'], ['blown', 'blow'], ['blowing', 'blow'], ['blows', 'blow'],
  // burn
  ['burned', 'burn'], ['burnt', 'burn'], ['burning', 'burn'], ['burns', 'burn'],
  // draw
  ['drew', 'draw'], ['drawn', 'draw'], ['drawing', 'draw'], ['draws', 'draw'],
  // drive
  ['drove', 'drive'], ['driven', 'drive'], ['driving', 'drive'], ['drives', 'drive'],
  // fall
  ['fell', 'fall'], ['fallen', 'fall'], ['falling', 'fall'], ['falls', 'fall'],
  // feel
  ['felt', 'feel'], ['feeling', 'feel'], ['feels', 'feel'],
  // get
  ['got', 'get'], ['gotten', 'get'], ['getting', 'get'], ['gets', 'get'],
  // give
  ['gave', 'give'], ['given', 'give'], ['giving', 'give'], ['gives', 'give'],
  // go
  ['went', 'go'], ['gone', 'go'], ['going', 'go'], ['goes', 'go'],
  // have
  ['had', 'have'], ['having', 'have'], ['has', 'have'],
  // hold
  ['held', 'hold'], ['holding', 'hold'], ['holds', 'hold'],
  // keep
  ['kept', 'keep'], ['keeping', 'keep'], ['keeps', 'keep'],
  // leave
  ['left', 'leave'], ['leaving', 'leave'], ['leaves', 'leave'],
  // lose
  ['lost', 'lose'], ['losing', 'lose'], ['loses', 'lose'],
  // make
  ['made', 'make'], ['making', 'make'], ['makes', 'make'],
  // run
  ['ran', 'run'], ['running', 'run'], ['runs', 'run'],
  // see
  ['saw', 'see'], ['seen', 'see'], ['seeing', 'see'], ['sees', 'see'],
  // shoot
  ['shot', 'shoot'], ['shooting', 'shoot'], ['shoots', 'shoot'],
  // speak
  ['spoke', 'speak'], ['spoken', 'speak'], ['speaking', 'speak'], ['speaks', 'speak'],
  // stand
  ['stood', 'stand'], ['standing', 'stand'], ['stands', 'stand'],
  // strike
  ['struck', 'strike'], ['stricken', 'strike'], ['striking', 'strike'], ['strikes', 'strike'],
  // take
  ['took', 'take'], ['taken', 'take'], ['taking', 'take'], ['takes', 'take'],
  // throw
  ['threw', 'throw'], ['thrown', 'throw'], ['throwing', 'throw'], ['throws', 'throw'],
  // wear
  ['wore', 'wear'], ['worn', 'wear'], ['wearing', 'wear'], ['wears', 'wear'],
  // win
  ['won', 'win'], ['winning', 'win'], ['wins', 'win']
]);

// Pronoun replacement maps
const POSSESSIVE_PRONOUNS = new Set(['my', 'your', 'his', 'her', 'our', 'their']);
const OBJECT_PRONOUNS = new Set(['me', 'you', 'him', 'her', 'us', 'them']);

/**
 * Lemmatize a single verb token.
 * Returns base lemma candidate or the original token if not matched.
 * @param {string} word
 * @returns {string[]}
 */
export function lemmatizeVerb(word) {
  if (!word || typeof word !== 'string') return [];
  const lower = word.toLowerCase();

  // 1. Direct irregular check
  if (IRREGULAR_VERB_MAP.has(lower)) {
    return [IRREGULAR_VERB_MAP.get(lower)];
  }

  const results = new Set();

  // 2. Regular suffix patterns
  if (lower.endsWith('ied') && lower.length > 4) {
    results.add(lower.slice(0, -3) + 'y');
  } else if (lower.endsWith('ed') && lower.length > 3) {
    // e.g. dropped -> drop
    if (/(.)\1ed$/.test(lower) && lower.length > 4) {
      results.add(lower.slice(0, -3));
    }
    results.add(lower.slice(0, -2)); // e.g. walked -> walk
    results.add(lower.slice(0, -1)); // e.g. danced -> dance
  }

  if (lower.endsWith('ing') && lower.length > 4) {
    // e.g. stopping -> stop
    if (/(.)\1ing$/.test(lower) && lower.length > 5) {
      results.add(lower.slice(0, -4));
    }
    results.add(lower.slice(0, -3));     // e.g. playing -> play
    results.add(lower.slice(0, -3) + 'e'); // e.g. making -> make
  }

  if (lower.endsWith('es') && lower.length > 3) {
    results.add(lower.slice(0, -2));
    results.add(lower.slice(0, -1));
  } else if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
    results.add(lower.slice(0, -1));
  }

  return Array.from(results);
}

/**
 * Generate candidate phrases for dictionary lookup.
 * Generates:
 * 1. Exact cleaned phrase
 * 2. Pronoun normalized ("someone's" / "one's")
 * 3. Verb lemmatized
 * 4. Combined verb lemmatized + pronoun normalized
 *
 * @param {string} phrase
 * @returns {string[]}
 */
export function generateCandidatePhrases(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];

  const trimmed = phrase.trim();
  if (!trimmed) return [];

  const candidates = new Set();
  const lower = trimmed.toLowerCase();
  candidates.add(lower);

  const tokens = lower.split(/\s+/);
  if (tokens.length < 2) {
    return [lower];
  }

  // 1. Check if tokens contain pronouns
  const hasPossessive = tokens.some((t) => POSSESSIVE_PRONOUNS.has(t));
  const hasObject = tokens.some((t) => OBJECT_PRONOUNS.has(t));

  const pronounVariants = [];
  if (hasPossessive) {
    const withSomeones = tokens.map((t) => (POSSESSIVE_PRONOUNS.has(t) ? "someone's" : t)).join(' ');
    const withOnes = tokens.map((t) => (POSSESSIVE_PRONOUNS.has(t) ? "one's" : t)).join(' ');
    pronounVariants.push(withSomeones, withOnes);
  }

  if (hasObject) {
    const withSomeone = tokens.map((t) => (OBJECT_PRONOUNS.has(t) ? 'someone' : t)).join(' ');
    pronounVariants.push(withSomeone);
  }

  for (const pv of pronounVariants) {
    candidates.add(pv);
  }

  // 2. Lemmatize the leading verb (or secondary token if first is an adverb / auxiliary)
  const verbLemmas = lemmatizeVerb(tokens[0]);
  for (const vLemma of verbLemmas) {
    if (vLemma !== tokens[0]) {
      const lemmatizedTokens = [vLemma, ...tokens.slice(1)];
      const lemmatizedPhrase = lemmatizedTokens.join(' ');
      candidates.add(lemmatizedPhrase);

      // Also combine with pronoun substitutions
      if (hasPossessive) {
        const someones = lemmatizedTokens.map((t) => (POSSESSIVE_PRONOUNS.has(t) ? "someone's" : t)).join(' ');
        const ones = lemmatizedTokens.map((t) => (POSSESSIVE_PRONOUNS.has(t) ? "one's" : t)).join(' ');
        candidates.add(someones);
        candidates.add(ones);
      }
      if (hasObject) {
        const someone = lemmatizedTokens.map((t) => (OBJECT_PRONOUNS.has(t) ? 'someone' : t)).join(' ');
        candidates.add(someone);
      }
    }
  }

  return Array.from(candidates);
}
