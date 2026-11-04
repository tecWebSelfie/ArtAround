import { audioText, audioTextHash, AUDIO_QUEUE } from '@/lib/content-audio'
import { normalizeLocale } from '@/lib/localized'
import { allowRequest } from '@/lib/rate-limit'
import { asViewer, getSession } from '@/lib/session'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

/**
 * Read-aloud audio of a content (`src/lib/content-audio.ts`):
 *
 *   GET /api/content-audio/ID?locale=it          → the MP3 (Range supported)
 *   GET /api/content-audio/ID?locale=it&check=1  → { status } without the file
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!allowRequest(request, 60)) return json('busy', 429)
  const { id } = await params
  const url = new URL(request.url)
  const locale = normalizeLocale(url.searchParams.get('locale') ?? 'en') ?? 'en'
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

  // 2. The text in the requested language, never the English fallback.
  const content = await payload.findByID({
    collection: 'contents',
    id,
    locale,
    fallbackLocale: false,
    depth: 0,
    select: { title: true, body: true },
    overrideAccess: true,
  })
  if (!content.body) return json('translating', 202)
  const textHash = audioTextHash(
    audioText(content.title ?? '', convertLexicalToPlaintext({ data: content.body })),
  )

  // 3. A current audio is served; a missing or stale one is generated.
  const { docs } = await payload.find({
    collection: 'contentAudio',
    where: { and: [{ content: { equals: id } }, { locale: { equals: locale } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const audio = docs[0]
  if (audio?.filename && audio.textHash === textHash) {
    if (url.searchParams.has('check')) return json('ready', 200)
    const staticDir = payload.collections.contentAudio.config.upload.staticDir || 'contentAudio'
    const file = await readFile(path.resolve(staticDir, audio.filename))
    return audioResponse(file, request.headers.get('range'), textHash)
  }
  if (!process.env.FISH_API_KEY) return json('unavailable', 503)
  const key = `${id}:${locale}`
  if (Date.now() - (queuedAt.get(key) ?? 0) > REQUEUE_AFTER_MS) {
    queuedAt.set(key, Date.now())
    await payload.jobs.queue({
      task: 'generateContentAudio',
      input: { contentId: id, locale },
      queue: AUDIO_QUEUE,
    })
  }
  return json('pending', 202)
}

/**
 * The MP3, whole or the byte range the player asks for: Safari plays media
 * only from servers that honour `Range`, and seeking needs it everywhere.
 */
function audioResponse(file: Buffer, range: string | null, etag: string) {
  const headers = {
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    // The URL stays the same when the text changes: revalidate by fingerprint.
    'Cache-Control': 'private, no-cache',
    ETag: `"${etag}"`,
  }
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) {
    return new Response(new Uint8Array(file), {
      headers: { ...headers, 'Content-Length': String(file.length) },
    })
  }
  // `bytes=-N` asks for the last N bytes.
  const start = match[1] ? Number(match[1]) : Math.max(0, file.length - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), file.length - 1) : file.length - 1
  if (start > end || start >= file.length) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${file.length}` },
    })
  }
  return new Response(new Uint8Array(file.subarray(start, end + 1)), {
    status: 206,
    headers: {
      ...headers,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${file.length}`,
    },
  })
}
