import {
  AUDIO_MODEL,
  AUDIO_VOICE,
  audioTextHash,
  contentAudioText,
  contentAudioWhere,
  mp3DurationSeconds,
  splitForSpeech,
} from '@/lib/content-audio'
import { speechModel } from '@/lib/ai-models'
import { generateSpeech } from 'ai'
import type { PayloadRequest, TaskConfig } from 'payload'

/** The language contents are written in; its audio length becomes the content's. */
const SOURCE_LOCALE = 'en'

/**
 * Generates (or refreshes) the read-aloud MP3 of one content/version in one locale
 * and stores it in `contentAudio` (`src/lib/content-audio.ts`).
 *
 * Queued by the `contents` hook when the source text changes, and by
 * `/api/content-audio/[id]` the first time someone asks to listen in another
 * language. It reads only a real translation (no fallback to English): until
 * the translator has written one, there is nothing to read and the task ends.
 * Re-runs are cheap: an audio whose `textHash` matches the text is kept.
 */
export async function generateContentAudio(
  req: PayloadRequest,
  {
    contentId,
    locale,
    variantId,
  }: { contentId: string; locale: string; variantId?: string | null },
): Promise<{ status: 'no-text' | 'up-to-date' | 'generated'; seconds?: number }> {
  const { payload } = req
  // Independent reads: the content (its title, and the body of a base
  // audio) and the saved version a personal audio reads instead.
  const [content, variant] = await Promise.all([
    payload.findByID({
      collection: 'contents',
      id: contentId,
      locale: locale as 'en',
      fallbackLocale: false,
      depth: 0,
      select: { title: true, body: true },
      overrideAccess: true,
      req,
    }),
    variantId
      ? payload
          .findByID({
            collection: 'contentVariants',
            id: variantId,
            locale: locale as 'en',
            fallbackLocale: false,
            depth: 0,
            overrideAccess: true,
            req,
          })
          .catch(() => null)
      : null,
  ])
  // A queued job must never attach another content's version to this content's audio.
  if (
    variantId &&
    (!variant?.body || variant.kind !== 'version' || variant.content !== contentId)
  ) {
    return { status: 'no-text' }
  }
  const body = variant?.body ?? content.body
  if (!body) return { status: 'no-text' }
  const text = contentAudioText({ ...content, body })
  const textHash = audioTextHash(text)

  const { docs } = await payload.find({
    collection: 'contentAudio',
    where: contentAudioWhere(contentId, locale, variantId),
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const existing = docs[0]
  if (existing?.textHash === textHash) return { status: 'up-to-date' }

  // One speech request per chunk, in order; the MP3s are joined (see MAX_CHUNK_CHARS).
  // Fish Audio, or the mock under AI_MOCK=true (src/lib/ai-models.ts).
  const model = await speechModel(AUDIO_MODEL)
  const parts: Uint8Array[] = []
  const chunks = splitForSpeech(text)
  for (const [index, chunk] of chunks.entries()) {
    const { audio } = await generateSpeech({
      model,
      text: chunk,
      voice: AUDIO_VOICE,
      outputFormat: 'mp3',
    }).catch(
      failedAt(
        `speech of part ${index + 1}/${chunks.length} (${chunk.length} chars)`,
        contentId,
        locale,
      ),
    )
    parts.push(audio.uint8Array)
  }
  const data = Buffer.concat(parts)
  const seconds = mp3DurationSeconds(data)
  const file = {
    data,
    mimetype: 'audio/mpeg',
    name: `content-${contentId}${variantId ? `-${variantId}` : ''}-${locale}.mp3`,
    size: data.length,
  }
  const fields = {
    content: contentId,
    locale,
    variant: variantId ?? null,
    textHash,
    durationSeconds: seconds,
    model: AUDIO_MODEL,
    voice: AUDIO_VOICE,
  }
  const saving = `saving ${file.name} (${data.length} bytes)`
  if (existing) {
    await payload
      .update({
        collection: 'contentAudio',
        id: existing.id,
        data: fields,
        file,
        overrideAccess: true,
        req,
      })
      .catch(failedAt(saving, contentId, locale))
  } else {
    await payload
      .create({
        collection: 'contentAudio',
        data: fields,
        file,
        overrideAccess: true,
        req,
      })
      .catch(failedAt(saving, contentId, locale))
  }

  // Only base source audio replaces the estimate; a variant duration is a request/cache key.
  if (!variantId && locale === SOURCE_LOCALE && seconds) {
    await payload.update({
      collection: 'contents',
      id: contentId,
      locale: SOURCE_LOCALE,
      data: { durationSeconds: seconds },
      depth: 0,
      overrideAccess: true,
      // Only the length changed: no new audio to queue.
      context: { skipContentAudio: true },
      req,
    })
  }
  return { status: 'generated', seconds }
}

/**
 * Logs which stage of a generation failed (the speech of which part, or the
 * save of the MP3 and its record) before the job records the error, so the
 * server log of a deployment that can't be entered says where it broke.
 */
const failedAt =
  (stage: string, contentId: string, locale: string) =>
  (error: unknown): never => {
    console.error(`[content-audio] ${contentId} (${locale}) failed at ${stage}:`, error)
    throw error
  }

export const generateContentAudioTask: TaskConfig<'generateContentAudio'> = {
  slug: 'generateContentAudio',
  label: 'Read a content aloud (text to speech)',
  inputSchema: [
    { name: 'contentId', type: 'text', required: true },
    { name: 'locale', type: 'text', required: true },
    { name: 'variantId', type: 'text' },
  ],
  outputSchema: [
    { name: 'status', type: 'text', required: true },
    { name: 'seconds', type: 'number' },
  ],
  retries: 2,
  handler: async ({ input, req }) => ({ output: await generateContentAudio(req, input) }),
}
