import config from '@/payload.config'
import { keepKnownLinks, LINKS_HEADER, type ExpansionLink } from '@/lib/expansion'
import { expansionPrompt } from '@/lib/expansion-prompt'
import { type MoreStep, previousStepsWhere, variantWhere } from '@/lib/expansion-variants'
import { externalSources, type ExternalSource } from '@/lib/expansion-sources'
import { normalizeLocale } from '@/lib/localized'
import { lockedMuseumId } from '@/lib/museum-mode'
import { allowRequest } from '@/lib/rate-limit'
import { asViewer } from '@/lib/session'
import { contentObjectId } from '@/lib/tour-navigation'
import type { ContentVariant, Object as MuseumObject } from '@/payload-types'
import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { TEXT_MODEL, textModel } from '@/lib/ai-models'
import { streamText } from 'ai'
import IsoCodes from 'iso-639-1'
import { NextResponse } from 'next/server'
import { getPayload, type Payload } from 'payload'
import { extractID } from 'payload/shared'
import { z } from 'zod'
import { ExpansionRequestSchema } from '@/lib/expansion-request'

/**
 * Extra text for a content or object modal, streamed as plain text:
 *
 *   saved variant for this request and language? → send it at once
 *   otherwise → read the original as the visitor (a locked paid body stops
 *   here) → museum entities it may link to + Wikidata/Wikipedia facts →
 *   one model call, streamed to the browser → saved as a `contentVariants`
 *   document (Lexical rich text) for the next visitor
 *
 * The response header `X-Expansion-Links` lists the entities the text may
 * link to, so the browser can turn `[name](/object/ID)` into a modal link with
 * a thumbnail. The model only writes text; it runs no app action.
 */
export const runtime = 'nodejs'

/** Linkable entities offered to the model; keeps the prompt small. */
const MAX_LINKS = 20

const Body = z.object({
  target: z.enum(['contents', 'objects']),
  id: z.string().min(1).max(64),
  lng: z.string().min(2).max(10),
  request: ExpansionRequestSchema,
})

/**
 * The additions on the same angle before `step`, in order, as the visitor
 * read them (plain text). The client asks for steps in order, so they are
 * normally all saved; a missing one is simply left out.
 */
async function previousAdditions(
  payload: Awaited<ReturnType<typeof getPayload>>,
  target: 'contents' | 'objects',
  id: string,
  locale: NonNullable<ReturnType<typeof normalizeLocale>>,
  more: MoreStep,
): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'contentVariants',
    where: previousStepsWhere(target, id, more),
    locale,
    fallbackLocale: false,
    sort: 'step',
    depth: 0,
    pagination: false,
  })
  return docs.flatMap((doc) => (doc.body ? [convertLexicalToPlaintext({ data: doc.body })] : []))
}

function thumbnailUrl(object: Pick<MuseumObject, 'thumbnail'>) {
  return typeof object.thumbnail === 'object' ? (object.thumbnail?.url ?? null) : null
}

export async function POST(request: Request) {
  if (!allowRequest(request, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { target, id, request: ask } = parsed.data
  if (target === 'objects' && ask.kind === 'version') {
    return NextResponse.json({ error: 'Versions exist for contents only' }, { status: 400 })
  }
  const locale = normalizeLocale(parsed.data.lng) ?? 'en'
  const payload = await getPayload({ config })
  const viewer = await asViewer()

  // The museum-mode cookie, read alongside the subject (step 2 needs it).
  const locked = lockedMuseumId()
  // 1. The original, read as the visitor: a paid body they may not read is absent.
  const subject = await readSubject(payload, { target, id, locale, viewer }).catch(() => null)
  if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (subject === 'locked') return NextResponse.json({ error: 'Locked' }, { status: 403 })

  // 2. Entities of the same museum the text may link to.
  const links = await museumLinks(payload, subject.object, {
    locale,
    viewer,
    locked: await locked,
  })
  const known = new Set(links.map((link) => link.id))
  const headers = { [LINKS_HEADER]: encodeURIComponent(JSON.stringify(links)) }

  // 3. Already written for this request and language? Send it as is.
  const where = variantWhere(target, id, ask)
  const saved = await payload.find({
    collection: 'contentVariants',
    where,
    locale,
    fallbackLocale: false,
    limit: 1,
    depth: 0,
  })
  const existing: ContentVariant | undefined = saved.docs[0]
  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  if (existing?.body) {
    const markdown = convertLexicalToMarkdown({ data: existing.body, editorConfig })
    return new Response(markdown, {
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // 4. Write it now: external facts first, then one streamed model call.
  // A further "Tell me more" continues the previous additions on the same
  // angle: the model gets them too, as text the visitor has already read.
  const alreadyRead =
    ask.kind === 'more' && (ask.step ?? 1) > 1
      ? await previousAdditions(payload, target, id, locale, {
          angle: ask.angle,
          step: ask.step ?? 1,
          age: ask.age,
        })
      : []
  const sources: ExternalSource[] = await externalSources(
    subject.object?.name ?? subject.name,
    locale,
    // The work's own Wikidata item when it has one: no search, no namesake.
    subject.object?.wikidataId ?? undefined,
  ).catch(() => [])
  const result = streamText({
    model: await textModel(),
    ...expansionPrompt({
      request: ask,
      language: IsoCodes.getName(locale) || 'English',
      subject: subject.name,
      text: subject.text,
      alreadyRead,
      links,
      sources,
    }),
    onError: ({ error }) => console.error('Expansion failed', error),
    // 5. Save the finished text (invented links removed) for the next visitor.
    onFinish: async ({ text }) => {
      const markdown = keepKnownLinks(text.trim(), known)
      if (!markdown) return
      const body = convertMarkdownToLexical({ editorConfig, markdown }) as ContentVariant['body']
      await saveExpansion(payload, { target, id, ask, locale, existing, body, sources }).catch(
        (error: unknown) => console.error('Saving the expansion failed', error),
      )
    },
  })
  return result.toTextStreamResponse({ headers })
}

type Viewer = Awaited<ReturnType<typeof asViewer>>
type Locale = NonNullable<ReturnType<typeof normalizeLocale>>
type Subject = { name: string; text: string; object: MuseumObject | null }

/**
 * What the text expands: a content (with its work, if any) or a work (with
 * the contents this visitor may read). `'locked'` for a paid body the
 * visitor can't read; throws when the document doesn't exist for them.
 */
async function readSubject(
  payload: Payload,
  {
    target,
    id,
    locale,
    viewer,
  }: { target: 'contents' | 'objects'; id: string; locale: Locale; viewer: Viewer },
): Promise<Subject | 'locked'> {
  if (target === 'contents') {
    const content = await payload.findByID({
      collection: 'contents',
      id,
      locale,
      depth: 1,
      ...viewer,
    })
    if (!content.body) return 'locked'
    const objectId = contentObjectId(content)
    const object = objectId
      ? await payload.findByID({ collection: 'objects', id: objectId, locale, depth: 1, ...viewer })
      : null
    return {
      name: object ? `${content.title} (${object.name})` : content.title,
      text: convertLexicalToPlaintext({ data: content.body }),
      object,
    }
  }
  const object = await payload.findByID({
    collection: 'objects',
    id,
    locale,
    depth: 1,
    populate: { contents: { title: true, body: true } },
    ...viewer,
  })
  // Only the contents this visitor may read feed the text.
  const readable = (object.contents ?? []).flatMap((content) =>
    typeof content === 'object' && content.body
      ? [`${content.title}: ${convertLexicalToPlaintext({ data: content.body })}`]
      : [],
  )
  return { name: object.name, text: [object.description ?? '', ...readable].join('\n\n'), object }
}

/**
 * The other works of the subject's museum and their contents, which the text
 * may link to. In museum mode, the locked museum wins when the work is in
 * several.
 */
async function museumLinks(
  payload: Payload,
  object: MuseumObject | null,
  { locale, viewer, locked }: { locale: Locale; viewer: Viewer; locked: string | null },
): Promise<ExpansionLink[]> {
  const museumIds = (object?.museums?.docs ?? []).map(extractID)
  const museumId = museumIds.find((museum) => museum === locked) ?? museumIds[0]
  if (!museumId) return []
  const { objects } = await payload.findByID({
    collection: 'museums',
    id: museumId,
    depth: 0,
    select: { objects: true },
  })
  const ids = (objects ?? [])
    .map(extractID)
    .filter((objectId) => objectId !== object?.id)
    .slice(0, MAX_LINKS)
  const { docs } = await payload.find({
    collection: 'objects',
    where: { id: { in: ids } },
    locale,
    depth: 1,
    pagination: false,
    populate: { contents: { title: true } },
    select: { name: true, thumbnail: true, contents: true },
    ...viewer,
  })
  return docs.flatMap((work) => {
    const thumbnail = thumbnailUrl(work)
    const contents = (work.contents ?? []).flatMap((content) =>
      typeof content === 'object'
        ? [{ kind: 'content' as const, id: content.id, title: content.title, thumbnail }]
        : [],
    )
    return [{ kind: 'object' as const, id: work.id, title: work.name, thumbnail }, ...contents]
  })
}

/**
 * Stores a finished text for the next visitor: another locale of the same
 * document when the request was already written in another language.
 */
async function saveExpansion(
  payload: Payload,
  {
    target,
    id,
    ask,
    locale,
    existing,
    body,
    sources,
  }: {
    target: 'contents' | 'objects'
    id: string
    ask: z.infer<typeof ExpansionRequestSchema>
    locale: Locale
    existing: ContentVariant | undefined
    body: ContentVariant['body']
    sources: ExternalSource[]
  },
) {
  if (existing) {
    await payload.update({ collection: 'contentVariants', id: existing.id, locale, data: { body } })
    return
  }
  await payload.create({
    collection: 'contentVariants',
    locale,
    data: {
      kind: ask.kind,
      ...(target === 'contents' ? { content: id } : { object: id }),
      ...(ask.age === undefined ? {} : { age: ask.age }),
      ...(ask.kind === 'more'
        ? { angle: ask.angle, step: ask.step ?? 1 }
        : {
            difficulty: ask.difficulty,
            audience: ask.audience,
            // The requested length is the lookup key; the real one is close to it.
            durationSeconds: ask.seconds,
          }),
      body,
      generation: {
        generated: true,
        model: TEXT_MODEL,
        sources: sources.map(({ title, url }) => ({ title, url })),
      },
    },
  })
}
