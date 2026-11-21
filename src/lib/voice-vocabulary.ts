/**
 * The controlled vocabulary of voice commands (base requirement of the course
 * specification; requirement 7 of `docs/plan/requisiti-18-33.md`): fixed
 * phrases, in Italian and English, each mapped to one navigation command.
 * `/api/assistant` tries them on the transcript before asking the language
 * model, so the listed commands work exactly and instantly; anything else
 * (other phrasings, other languages) still goes to the model, which maps free
 * speech onto the same commands.
 *
 * Every command has an on-screen equivalent: the Spotlight pills and the
 * reading options run the same ids (`navigation-commands.ts`).
 */

/**
 * `unavailable` tells the language model, in English, why the command may be
 * missing from the ones offered: the commands follow the navigation state
 * (`navigation-commands.ts`), so "cos'è questo" with no work open reaches
 * the model, which explains instead of guessing.
 */
type Vocabulary = { command: string; phrases: string[]; unavailable: string }[]

/** Phrases are compared after `normalize`: lowercase, no accents or punctuation. */
export const VOCABULARY: Vocabulary = [
  {
    command: 'next-stop',
    unavailable:
      'There is no stop to open: no tour is running, the tour is complete, or the current stop is already open.',
    phrases: ['avanti', 'prossima tappa', 'prossimo', 'vai avanti', 'next', 'next stop', 'go on'],
  },
  {
    command: 'previous-stop',
    unavailable: 'There is no previous stop: no tour is running or this is the first stop.',
    phrases: [
      'indietro',
      'tappa precedente',
      'precedente',
      'torna indietro',
      'previous',
      'previous stop',
      'go back',
    ],
  },
  {
    command: 'what-is-this',
    unavailable:
      'No content or tour stop is open on screen, or the work itself is already open: the visitor opens a work, its content or the tour stop first.',
    phrases: [
      'cos e questo',
      'che cos e',
      'cosa e questo',
      'what is this',
      'whats this',
      'what am i looking at',
    ],
  },
  {
    command: 'more:more',
    unavailable: 'No work, content or stop is open on screen, or it has nothing more to tell.',
    phrases: ['dimmi di piu', 'raccontami di piu', 'ancora', 'tell me more', 'more'],
  },
  {
    command: 'version:shorter',
    unavailable: 'No content is open on screen, or the short version is already shown.',
    phrases: ['dimmi di meno', 'piu breve', 'piu corto', 'tell me less', 'shorter', 'less'],
  },
  {
    command: 'version:simpler',
    unavailable: 'No content is open on screen, or the simpler version is already shown.',
    phrases: [
      'non ho capito',
      'non capisco',
      'troppo difficile',
      'piu semplice',
      'i dont understand',
      'too difficult',
      'simpler',
    ],
  },
  {
    command: 'version:harder',
    unavailable: 'No content is open on screen, or the most detailed version is already shown.',
    phrases: [
      'troppo semplice',
      'troppo facile',
      'piu approfondito',
      'too simple',
      'too easy',
      'more in depth',
    ],
  },
  {
    command: 'author',
    unavailable: 'No work is open on screen, or the open work has no known author.',
    phrases: [
      'chi e l autore',
      'chi l ha fatto',
      'chi l ha dipinto',
      'chi e l artista',
      'who is the author',
      'who made it',
      'who painted it',
      'who is the artist',
    ],
  },
  {
    command: 'style',
    unavailable: 'No work is open on screen, or the open work has no known style or movement.',
    phrases: [
      'qual e lo stile',
      'che stile e',
      'di che stile e',
      'what style is it',
      'what is the style',
      'which style',
    ],
  },
  {
    // The step-free route is the answer the map can give: it avoids stairs.
    command: 'wheelchair',
    unavailable: 'This museum has no step-free route on its map.',
    phrases: [
      'ci sono ostacoli',
      'ostacoli',
      'barriere architettoniche',
      'are there obstacles',
      'obstacles',
      'step free route',
    ],
  },
  {
    command: 'exit:nearest',
    unavailable: 'The map has no exit, or the route already leads to the nearest exit.',
    phrases: ['dov e l uscita', 'uscita', 'where is the exit', 'exit', 'way out'],
  },
  {
    command: 'service-type:bathrooms',
    unavailable: 'The map has no toilets, or the route already leads there.',
    phrases: [
      'dov e il bagno',
      'dov e la toilette',
      'bagno',
      'toilette',
      'where is the toilet',
      'toilet',
      'restroom',
      'bathroom',
    ],
  },
  {
    command: 'service-type:food',
    unavailable: 'The map has no food service, or the route already leads there.',
    phrases: ['dov e il bar', 'bar', 'caffetteria', 'where is the bar', 'cafe', 'food'],
  },
  {
    command: 'service-type:shop',
    unavailable: 'The map has no shop, or the route already leads there.',
    phrases: [
      'dov e lo shop',
      'dov e il negozio',
      'dov e il bookshop',
      'negozio',
      'bookshop',
      'where is the shop',
      'shop',
      'gift shop',
    ],
  },
]

/** Lowercase, accents and punctuation removed, single spaces ("Cos'è?" → "cos e"). */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
}

/**
 * Words a polite request may wrap around a phrase ("per favore, avanti").
 * Only stripped at the start and end: "e" (the normalized "è", or "and")
 * also sits inside phrases ("chi e l autore").
 */
const FILLERS = new Set(
  normalize(
    'per favore grazie scusa scusi mi puoi dire please could you can you tell me ok okay allora e',
  ).split(' '),
)

/** `words` without the fillers around them. */
function trimFillers(words: string[]) {
  let start = 0
  let end = words.length
  while (start < end && FILLERS.has(words[start])) start++
  while (end > start && FILLERS.has(words[end - 1])) end--
  return words.slice(start, end)
}

/**
 * The command a transcript names, if it is one of the vocabulary's phrases
 * (possibly with polite words around it). `reason` is null when the command
 * is available right now; otherwise it is the vocabulary's `unavailable`
 * text, for the language model to explain (in the visitor's language)
 * instead of improvising. An available command wins over an unavailable one,
 * then longer phrases win ("tappa precedente" over "precedente"). Anything
 * else returns null and is left to the language model.
 */
export function matchControlledCommand(
  transcript: string,
  available: readonly string[],
): { command: string; reason: string | null } | null {
  const words = normalize(transcript).split(' ').filter(Boolean)
  const said = words.join(' ')
  const core = trimFillers(words).join(' ')
  let best: { entry: Vocabulary[number]; runnable: boolean; length: number } | null = null
  for (const entry of VOCABULARY) {
    const runnable = available.includes(entry.command)
    for (const phrase of entry.phrases) {
      const key = normalize(phrase)
      if (said !== key && core !== key) continue
      const better =
        !best ||
        (runnable && !best.runnable) ||
        (runnable === best.runnable && key.length > best.length)
      if (better) best = { entry, runnable, length: key.length }
    }
  }
  return (
    best && { command: best.entry.command, reason: best.runnable ? null : best.entry.unavailable }
  )
}
