import {
  audioTextHash,
  AUDIO_QUEUE,
  contentAudioText,
  contentAudioWhere,
} from '@/lib/content-audio'
import { speechAvailable } from '@/lib/ai-models'
import { VersionRequest } from '@/lib/expansion-request'
import { variantWhere } from '@/lib/expansion-variants'
import { normalizeLocale } from '@/lib/localized'
import { allowRequest } from '@/lib/rate-limit'
import { asViewer, getSession } from '@/lib/session'
import { open, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

/**
 * Read-aloud audio of a content (`src/lib/content-audio.ts`):
 *
 *   GET /api/content-audio/ID?locale=it          → the MP3 (Range supported)
 *   GET /api/content-audio/ID?locale=it&check=1  → { status } without the file
 *   Add version=<JSON version request> to read the matching saved personal text.
 *
 * Statuses: `ready`; `pending` (being generated: ask again in a few
 * seconds); `translating` (no translation in that language yet, the page's
 * own localized read is producing it); `locked` (the visitor can't read the
 * body: a paid content they don't own); `unavailable` (no speech API key).
 *
 * The body is read *as the visitor*, so whoever can't read a paid text can't
 * hear it either. The `contentAudio` collection itself is closed to visitors.
 */
export const runtime = 'nodejs'

/**
 * Contents whose audio was just queued here, so a visitor polling every few
 * seconds doesn't queue it again. Per server instance; a duplicate job would
 * only find the audio up to date.
 */
const queuedAt = new Map<string, number>()
const REQUEUE_AFTER_MS = 2 * 60_000

const json = (status: string, code: number) =>
  NextResponse.json({ status }, { status: code, headers: { 'Cache-Control': 'no-store' } })

/** The `version` query parameter as JSON, or null when it isn't JSON at all. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!allowRequest(request, 60)) return json('busy', 429)
  const { id } = await params
  const url = new URL(request.url)
  const locale = normalizeLocale(url.searchParams.get('locale') ?? 'en') ?? 'en'
  const versionParam = url.searchParams.get('version')
  const version = versionParam === null ? null : VersionRequest.safeParse(parseJson(versionParam))
  if (version && !version.success) return json('invalid-version', 400)
  const { payload } = await getSession()
  const viewer = await asViewer()

  // 1. Can the visitor read the text at all? (A locked paid body is absent.)
  const source = await payload
    .findByID({
      collection: 'contents',
      id,
      locale: 'en',
      depth: 0,
      select: { body: true },
      ...viewer,
    })
    .catch(() => null)
  if (!source) return json('not-found', 404)
  if (!source.body) return json('locked', 403)

  // 2. The saved version asked for (resolved by the same validated parameters
  //    as /api/expand), the text in the requested language (never the English
  //    fallback) and the stored audio. Only the audio depends on the version,
  //    so the content read runs alongside both.
  const variantRead = version?.success
    ? payload
        .find({
          collection: 'contentVariants',
          where: variantWhere('contents', id, version.data),
          locale,
          fallbackLocale: false,
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
        .then(({ docs }) => docs[0])
    : Promise.resolve(undefined)
  const [variant, content, { docs }] = await Promise.all([
    variantRead,
    payload.findByID({
      collection: 'contents',
      id,
      locale,
      fallbackLocale: false,
      depth: 0,
      select: { title: true, body: true },
      overrideAccess: true,
    }),
    variantRead.then((found) =>
      payload.find({
        collection: 'contentAudio',
        where: contentAudioWhere(id, locale, found?.id),
        depth: 0,
        limit: 1,
        overrideAccess: true,
      }),
    ),
  ])
  // While the version's text stream is saving, wait instead of accidentally
  // playing the base version.
  if (version && !variant?.body) return json('translating', 202)
  if (!content.body && !variant?.body) return json('translating', 202)
  const textHash = audioTextHash(
    contentAudioText({ ...content, body: variant?.body ?? content.body }),
  )

  // 3. A current audio is served; a missing or stale one is generated.
  const audio = docs[0]
  if (audio?.filename && audio.textHash === textHash) {
    if (url.searchParams.has('check')) return json('ready', 200)
    const etag = `"${textHash}"`
    // The player revalidates by fingerprint: an unchanged audio costs no read.
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } })
    }
    const staticDir = payload.collections.contentAudio.config.upload.staticDir || 'contentAudio'
    return audioResponse(
      path.resolve(staticDir, audio.filename),
      request.headers.get('range'),
      etag,
    )
  }
  if (!speechAvailable()) return json('unavailable', 503)
  const key = `${id}:${locale}:${variant?.id ?? 'base'}`
  if (Date.now() - (queuedAt.get(key) ?? 0) > REQUEUE_AFTER_MS) {
    queuedAt.set(key, Date.now())
    await payload.jobs.queue({
      task: 'generateContentAudio',
      input: { contentId: id, locale, ...(variant ? { variantId: variant.id } : {}) },
      queue: AUDIO_QUEUE,
    })
  }
  return json('pending', 202)
}

/**
 * The MP3, whole or the byte range the player asks for: Safari plays media
 * only from servers that honour `Range`, and seeking needs it everywhere.
 * Only the requested bytes are read from disk.
 */
async function audioResponse(filePath: string, range: string | null, etag: string) {
  const { size } = await stat(filePath)
  const headers = {
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    // The URL stays the same when the text changes: revalidate by fingerprint.
    'Cache-Control': 'private, no-cache',
    ETag: etag,
  }
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) {
    return new Response(new Uint8Array(await readFile(filePath)), {
      headers: { ...headers, 'Content-Length': String(size) },
    })
  }
  // `bytes=-N` asks for the last N bytes.
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  }
  const chunk = Buffer.alloc(end - start + 1)
  const file = await open(filePath)
  try {
    await file.read(chunk, 0, chunk.length, start)
  } finally {
    await file.close()
  }
  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      ...headers,
      'Content-Length': String(chunk.length),
      'Content-Range': `bytes ${start}-${end}/${size}`,
    },
  })
}
