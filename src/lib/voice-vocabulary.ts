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

type Vocabulary = { command: string; phrases: string[] }[]

/** Phrases are compared after `normalize`: lowercase, no accents or punctuation. */
export const VOCABULARY: Vocabulary = [
  {
    command: 'next-stop',
    phrases: ['avanti', 'prossima tappa', 'prossimo', 'vai avanti', 'next', 'next stop', 'go on'],
  },
  {
    command: 'previous-stop',
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
    phrases: ['dimmi di piu', 'raccontami di piu', 'ancora', 'tell me more', 'more'],
  },
  {
    command: 'version:shorter',
    phrases: ['dimmi di meno', 'piu breve', 'piu corto', 'tell me less', 'shorter', 'less'],
  },
  {
    command: 'version:simpler',
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
    phrases: ['dov e l uscita', 'uscita', 'where is the exit', 'exit', 'way out'],
  },
  {
    command: 'service-type:bathrooms',
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
    phrases: ['dov e il bar', 'bar', 'caffetteria', 'where is the bar', 'cafe', 'food'],
  },
  {
    command: 'service-type:shop',
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
 * (possibly with polite words around it) and the command is available right
 * now. Longer phrases win ("tappa precedente" over "precedente"). Anything
 * else returns null and is left to the language model.
 */
export function matchControlledCommand(
  transcript: string,
  available: readonly string[],
): string | null {
  const words = normalize(transcript).split(' ').filter(Boolean)
  const said = words.join(' ')
  const core = trimFillers(words).join(' ')
  let best: { command: string; length: number } | null = null
  for (const { command, phrases } of VOCABULARY) {
    if (!available.includes(command)) continue
    for (const phrase of phrases) {
      const key = normalize(phrase)
      if ((said === key || core === key) && (!best || key.length > best.length)) {
        best = { command, length: key.length }
      }
    }
  }
  return best?.command ?? null
}
