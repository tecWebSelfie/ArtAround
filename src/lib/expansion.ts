import type { Difficulty } from '@/payload-types'

/**
 * Pure rules shared by `/api/expand` (server) and `ContentExpansion` (browser)
 * for the extra texts shown in content/object modals:
 *
 * - which requests exist (`ExpansionRequest`): an addition ("Tell me more",
 *   "Curiosities", "Its story") or another version of the content
 *   (difficulty, reading time, audience);
 * - the text format: plain paragraphs separated by a blank line, `**bold**`,
 *   and links only to entities of the same museum, written as
 *   `[name](/object/ID)` or `[title](/content/ID)`.
 *
 * Both sides apply the same link rule, so a link the model invented is shown
 * as plain text while streaming and removed before the text is saved.
 */

export const EXPANSION_ANGLES = ['more', 'curiosities', 'story'] as const
export type ExpansionAngle = (typeof EXPANSION_ANGLES)[number]

export const AUDIENCES = ['everyone', 'children'] as const
export type Audience = (typeof AUDIENCES)[number]

export type ExpansionRequest =
  | { kind: 'more'; angle: ExpansionAngle }
  | { kind: 'version'; difficulty: Difficulty; minutes: number; audience: Audience }

/** A museum entity the text may link to, with its thumbnail for the preview row. */
export type ExpansionLink = {
  kind: 'object' | 'content'
  id: string
  title: string
  thumbnail?: string | null
}

/** Response header carrying the linkable entities (URI-encoded JSON). */
export const LINKS_HEADER = 'X-Expansion-Links'

const LINK = /\[([^\]]+)\]\(\/(object|content)\/([A-Za-z0-9_-]+)\)/g

/** Replaces links to unknown entities with their plain label. */
export function keepKnownLinks(markdown: string, known: ReadonlySet<string>) {
  return markdown.replace(LINK, (match, label: string, _kind, id: string) =>
    known.has(id) ? match : label,
  )
}

/** IDs of the entities a text links to, in order of first mention. */
export function linkedIds(markdown: string) {
  return [...new Set([...markdown.matchAll(LINK)].map((match) => match[3]))]
}

export type InlinePart =
  | { type: 'text'; text: string; bold: boolean }
  | { type: 'link'; text: string; kind: 'object' | 'content'; id: string }

/**
 * Splits one paragraph into text, bold and link parts for rendering. Only the
 * two inline marks above exist, so a small scanner is enough (no markdown
 * library in the browser).
 */
export function inlineParts(paragraph: string): InlinePart[] {
  const parts: InlinePart[] = []
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(\/(object|content)\/([A-Za-z0-9_-]+)\)/g
  let last = 0
  for (const match of paragraph.matchAll(pattern)) {
    if (match.index > last) {
      parts.push({ type: 'text', text: paragraph.slice(last, match.index), bold: false })
    }
    if (match[1]) parts.push({ type: 'text', text: match[1], bold: true })
    else {
      parts.push({
        type: 'link',
        text: match[2],
        kind: match[3] as 'object' | 'content',
        id: match[4],
      })
    }
    last = match.index + match[0].length
  }
  if (last < paragraph.length) {
    parts.push({ type: 'text', text: paragraph.slice(last), bold: false })
  }
  return parts
}

/**
 * Paragraphs of a (possibly still streaming) text. While streaming, the last
 * paragraph is still being written, so only finished ones are returned: the
 * visitor sees whole paragraphs appear, never words being typed.
 */
export function finishedParagraphs(text: string, done: boolean) {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim())
  if (!done) paragraphs.pop()
  return paragraphs.filter(Boolean)
}

/** Paragraph → plain words for speech (links and bold read as their text). */
export function speakableText(paragraph: string) {
  return inlineParts(paragraph)
    .map((part) => part.text)
    .join('')
}

/** About 200 words a minute: the reading-time target given to the model. */
export const WORDS_PER_MINUTE = 200
