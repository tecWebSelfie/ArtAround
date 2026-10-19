import { WORDS_PER_MINUTE, type ExpansionLink, type ExpansionRequest } from './expansion'

/**
 * The instructions `/api/expand` gives the language model, kept apart from
 * the route so they can be read (and tried from a script) on their own.
 * The model only writes text: it gets the original, the museum entities it
 * may link to and the external notes, and answers with paragraphs.
 */

const ANGLE_TASKS = {
  more: 'Add two or three short paragraphs that tell the visitor something new about the subject: details to look at, meaning, technique. Do not repeat the original text.',
  curiosities:
    'Add two or three short paragraphs of surprising, little-known but true details about the subject.',
  story:
    'Add two or three short paragraphs about who made it, when and where, and the historical context.',
} as const

const DIFFICULTY_STYLE = {
  easy: 'short sentences and everyday words',
  medium: 'clear sentences for an interested adult',
  hard: 'precise art-historical terminology',
} as const

function task(request: ExpansionRequest) {
  if (request.kind === 'more') return ANGLE_TASKS[request.angle]
  return [
    'Rewrite the original text as a new version of it. Keep every fact; do not add new ones.',
    `Use ${DIFFICULTY_STYLE[request.difficulty]}.`,
    `It should take about ${request.minutes} minute(s) to read (about ${request.minutes * WORDS_PER_MINUTE} words).`,
    request.audience === 'children'
      ? 'Write for children aged 5 to 10: friendly, concrete, with something to look for.'
      : '',
  ].join(' ')
}

/** Square brackets in a title would break the `[label](/object/ID)` link syntax. */
const linkLabel = (title: string) => title.replace(/[[\]]/g, '').trim()

export function expansionPrompt({
  request,
  language,
  subject,
  text,
  links,
  sources,
}: {
  request: ExpansionRequest
  /** Language name, e.g. "Italian". */
  language: string
  subject: string
  text: string
  links: ExpansionLink[]
  sources: { title: string; text: string }[]
}) {
  return {
    system: [
      'You write texts for a museum guide app. They appear inside the page about an artwork,',
      'right after its description, as if the museum had written them.',
      `Write in ${language}.`,
      'Format: plain paragraphs separated by one blank line. You may use **bold** for a few',
      'key words. No headings, no lists, no emojis. Do not address the reader as having asked',
      'something, do not mention sources, notes, or how the text was made.',
      'Facts: use only the original text, the museum entities and the external notes below.',
      'Never invent facts, anecdotes, dates or names. If the material is thin, write less:',
      'one short paragraph is better than an invented one.',
      'External notes come from a search and may be about something else: use them only when',
      'they clearly describe the same subject. When unsure, leave the fact out.',
      'Links: only when one of the museum entities listed below is truly related to the subject',
      '(same artist, period, technique or theme), you may mention it and link it exactly as',
      '[its name](/object/ID) or [its title](/content/ID). Never write any other link.',
    ].join('\n'),
    prompt: [
      `Task: ${task(request)}`,
      `Subject: ${subject}`,
      `Original text:\n${text.slice(0, 6_000)}`,
      links.length
        ? `Museum entities you may link:\n${links.map((link) => `/${link.kind}/${link.id}: ${linkLabel(link.title)}`).join('\n')}`
        : '',
      ...sources.map((source) => `External note (${source.title}):\n${source.text}`),
    ].join('\n\n'),
  }
}
