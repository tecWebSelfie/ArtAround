import config from '@/payload.config'
import {
  AUDIENCES,
  EXPANSION_ANGLES,
  keepKnownLinks,
  LINKS_HEADER,
  MAX_EXPANSION_STEPS,
  type ExpansionAngle,
  type ExpansionLink,
} from '@/lib/expansion'
import { expansionPrompt } from '@/lib/expansion-prompt'
import { previousStepsWhere, variantWhere } from '@/lib/expansion-variants'
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
import { getPayload } from 'payload'
import { z } from 'zod'

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
  request: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('more'),
      angle: z.enum(EXPANSION_ANGLES),
      step: z.number().int().min(1).max(MAX_EXPANSION_STEPS).optional(),
      age: z.number().int().min(0).max(17).optional(),
    }),
    z
      .object({
        kind: z.literal('version'),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        // From a few seconds (a one-line caption) to a quarter of an hour.
        seconds: z.number().int().min(3).max(900),
        audience: z.enum(AUDIENCES),
        age: z.number().int().min(0).max(17).optional(),
      })
      .refine((request) => request.age === undefined || request.audience === 'children'),
  ]),
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
  angle: ExpansionAngle,
  step: number,
  locale: NonNullable<ReturnType<typeof normalizeLocale>>,
  age?: number,
): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'contentVariants',
    where: previousStepsWhere(target, id, angle, step, age),
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

  // 1. The original, read as the visitor: a paid body they may not read is absent.
  let subject: { name: string; text: string; object: MuseumObject | null }
  try {
    if (target === 'contents') {
      const content = await payload.findByID({
        collection: 'contents',
        id,
        locale,
        depth: 1,
        ...viewer,
      })
      if (!content.body) return NextResponse.json({ error: 'Locked' }, { status: 403 })
      const objectId = contentObjectId(content)
      const object = objectId
        ? await payload.findByID({
            collection: 'objects',
            id: objectId,
            locale,
            depth: 1,
            ...viewer,
          })
        : null
      subject = {
        name: object ? `${content.title} (${object.name})` : content.title,
        text: convertLexicalToPlaintext({ data: content.body }),
        object,
      }
    } else {
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
      subject = {
        name: object.name,
        text: [object.description ?? '', ...readable].join('\n\n'),
        object,
      }
    }
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 2. Entities of the same museum the text may link to.
  // In museum mode, prefer the locked museum when the object is in several.
  const locked = await lockedMuseumId()
  const museumIds = (subject.object?.museums?.docs ?? []).map((museum) =>
    typeof museum === 'string' ? museum : museum.id,
  )
  const museumId = museumIds.find((id) => id === locked) ?? museumIds[0]
  const links: ExpansionLink[] = []
  if (museumId) {
    const { objects } = await payload.findByID({
      collection: 'museums',
      id: museumId,
      depth: 0,
      select: { objects: true },
    })
    const ids = (objects ?? [])
      .map((entry) => (typeof entry === 'string' ? entry : entry.id))
      .filter((objectId) => objectId !== subject.object?.id)
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
    for (const object of docs) {
      links.push({
        kind: 'object',
        id: object.id,
        title: object.name,
        thumbnail: thumbnailUrl(object),
      })
      for (const content of object.contents ?? []) {
        if (typeof content === 'object') {
          links.push({
            kind: 'content',
            id: content.id,
            title: content.title,
            thumbnail: thumbnailUrl(object),
          })
        }
      }
    }
  }
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
      ? await previousAdditions(payload, target, id, ask.angle, ask.step ?? 1, locale, ask.age)
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
      try {
        if (existing) {
          // Same request, new language: another locale of the same document.
          await payload.update({
            collection: 'contentVariants',
            id: existing.id,
            locale,
            data: { body },
          })
        } else {
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
      } catch (error) {
        console.error('Saving the expansion failed', error)
      }
    },
  })
  return result.toTextStreamResponse({ headers })
}
