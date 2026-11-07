/**
 * In-Memory Curated High-Frequency Keyword to Idiom Index.
 * Enables zero-latency related idiom suggestions on single-word lookups (FR-009, SC-004).
 */

const IDIOM_INDEX = new Map([
  ['weather', [
    { phrase: 'under the weather', summary: 'Feeling slightly unwell, sick, or indisposed', badge: 'Idiom' },
    { phrase: 'weather the storm', summary: 'To successfully endure a very difficult period', badge: 'Idiom' },
    { phrase: 'fair-weather friend', summary: 'A person who is only dependable in good times', badge: 'Idiom' }
  ]],
  ['ice', [
    { phrase: 'break the ice', summary: 'To relieve social tension and get conversation started', badge: 'Idiom' },
    { phrase: 'skating on thin ice', summary: 'Taking huge risks that could easily lead to danger', badge: 'Idiom' },
    { phrase: 'tip of the iceberg', summary: 'Only a small visible fraction of a much larger problem', badge: 'Idiom' }
  ]],
  ['bullet', [
    { phrase: 'bite the bullet', summary: 'To face a difficult or unpleasant situation with courage', badge: 'Idiom' },
    { phrase: 'dodge a bullet', summary: 'To narrowly avoid a disastrous or unwelcome situation', badge: 'Idiom' },
    { phrase: 'silver bullet', summary: 'A simple, seemingly magical solution to a complex problem', badge: 'Idiom' }
  ]],
  ['bean', [
    { phrase: 'spill the beans', summary: 'To divulge a secret prematurely or inadvertently', badge: 'Idiom' },
    { phrase: 'full of beans', summary: 'Lively, energetic, or in high spirits', badge: 'Idiom' }
  ]],
  ['beans', [
    { phrase: 'spill the beans', summary: 'To divulge a secret prematurely or inadvertently', badge: 'Idiom' },
    { phrase: 'full of beans', summary: 'Lively, energetic, or in high spirits', badge: 'Idiom' }
  ]],
  ['cake', [
    { phrase: 'piece of cake', summary: 'Something very easy and straightforward to accomplish', badge: 'Idiom' },
    { phrase: "have one's cake and eat it too", summary: 'To seek having the advantages of two conflicting things', badge: 'Proverb' },
    { phrase: 'icing on the cake', summary: 'An additional benefit that makes a good situation even better', badge: 'Idiom' }
  ]],
  ['leg', [
    { phrase: "pull someone's leg", summary: 'To playfully tease or deceive someone in good humor', badge: 'Idiom' },
    { phrase: 'break a leg', summary: 'Good luck (especially in theatrical performance)', badge: 'Idiom' },
    { phrase: 'cost an arm and a leg', summary: 'To be excessively or outrageously expensive', badge: 'Idiom' }
  ]],
  ['stone', [
    { phrase: 'leave no stone unturned', summary: 'To try every possible course of action in order to achieve something', badge: 'Idiom' },
    { phrase: 'kill two birds with one stone', summary: 'To accomplish two different things with a single action', badge: 'Idiom' },
    { phrase: 'a rolling stone gathers no moss', summary: 'People who are always moving avoid attachments or responsibilities', badge: 'Proverb' }
  ]],
  ['word', [
    { phrase: 'actions speak louder than words', summary: 'What you do is more significant than what you say', badge: 'Proverb' },
    { phrase: "take someone's word for it", summary: 'To believe what someone says without independent proof', badge: 'Idiom' }
  ]],
  ['words', [
    { phrase: 'actions speak louder than words', summary: 'What you do is more significant than what you say', badge: 'Proverb' },
    { phrase: 'eat your words', summary: 'To admit that what you previously said was wrong', badge: 'Idiom' }
  ]],
  ['blue', [
    { phrase: 'once in a blue moon', summary: 'Happening extremely rarely or almost never', badge: 'Idiom' },
    { phrase: 'out of the blue', summary: 'Completely unexpectedly and without warning', badge: 'Idiom' }
  ]],
  ['cloud', [
    { phrase: 'every cloud has a silver lining', summary: 'Every difficult situation has a hopeful aspect', badge: 'Proverb' },
    { phrase: 'on cloud nine', summary: 'Experiencing extreme happiness and euphoria', badge: 'Idiom' }
  ]],
  ['water', [
    { phrase: 'water under the bridge', summary: 'Past events that are no longer considered important', badge: 'Idiom' },
    { phrase: 'in hot water', summary: 'In trouble or in a difficult predicament', badge: 'Idiom' },
    { phrase: 'test the waters', summary: 'To check how people will react before taking action', badge: 'Idiom' }
  ]],
  ['give', [
    { phrase: 'give up', summary: 'To surrender, abandon effort, or cease doing something', badge: 'Phrasal Verb' },
    { phrase: 'give in', summary: 'To succumb or submit to pressure or demands', badge: 'Phrasal Verb' },
    { phrase: 'give away', summary: 'To reveal a secret or give something for free', badge: 'Phrasal Verb' }
  ]],
  ['look', [
    { phrase: 'look forward to', summary: 'To await something with eager anticipation and pleasure', badge: 'Phrasal Verb' },
    { phrase: 'look into', summary: 'To investigate or examine something carefully', badge: 'Phrasal Verb' },
    { phrase: 'look after', summary: 'To take care of or attend to someone or something', badge: 'Phrasal Verb' }
  ]],
  ['run', [
    { phrase: 'run out of', summary: 'To exhaust the available supply of something', badge: 'Phrasal Verb' },
    { phrase: 'run into', summary: 'To encounter someone unexpectedly', badge: 'Phrasal Verb' },
    { phrase: 'run over', summary: 'To collide with or exceed a limit', badge: 'Phrasal Verb' }
  ]],
  ['take', [
    { phrase: 'take after', summary: 'To resemble a parent or ancestor in appearance or character', badge: 'Phrasal Verb' },
    { phrase: 'take with a grain of salt', summary: 'To view something with skepticism or reservation', badge: 'Idiom' },
    { phrase: 'take off', summary: 'To depart rapidly, remove clothing, or become suddenly successful', badge: 'Phrasal Verb' }
  ]],
  ['hand', [
    { phrase: 'bite the hand that feeds you', summary: 'To harm someone who has helped or supported you', badge: 'Proverb' },
    { phrase: 'get out of hand', summary: 'To become impossible to control or manage', badge: 'Idiom' }
  ]],
  ['boat', [
    { phrase: 'in the same boat', summary: 'Sharing the same difficult or unpleasant situation', badge: 'Idiom' },
    { phrase: 'rock the boat', summary: 'To disrupt a calm situation or challenge the status quo', badge: 'Idiom' }
  ]],
  ['bark', [
    { phrase: 'barking up the wrong tree', summary: 'Pursuing a mistaken line of thought or accusing the wrong person', badge: 'Idiom' },
    { phrase: 'his bark is worse than his bite', summary: 'Someone sounds much more fierce or aggressive than they actually are', badge: 'Proverb' }
  ]],
  ['needle', [
    { phrase: 'a needle in a haystack', summary: 'Something that is extraordinarily difficult or impossible to locate', badge: 'Idiom' }
  ]],
  ['hat', [
    { phrase: 'at the drop of a hat', summary: 'Immediately and without hesitation', badge: 'Idiom' }
  ]],
  ['light', [
    { phrase: 'see the light at the end of the tunnel', summary: 'A sign of hope or resolution at the end of a long struggle', badge: 'Idiom' }
  ]]
]);

/**
 * Retrieve related idioms for a given headword.
 * @param {string} word
 * @returns {Array<{ phrase: string, summary: string, badge: 'Idiom' | 'Phrasal Verb' | 'Proverb' }>}
 */
export function getRelatedIdioms(word) {
  if (!word || typeof word !== 'string') return [];
  const lower = word.toLowerCase().trim();
  const list = IDIOM_INDEX.get(lower);
  return Array.isArray(list) ? list.slice(0, 4) : [];
}
