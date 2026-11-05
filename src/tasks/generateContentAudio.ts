import {
  AUDIO_MODEL,
  AUDIO_VOICE,
  audioTextHash,
  contentAudioText,
  mp3DurationSeconds,
  splitForSpeech,
} from '@/lib/content-audio'
import { createFishAudio } from '@ai-sdk/fish-audio'
import { generateSpeech } from 'ai'
import type { PayloadRequest, TaskConfig } from 'payload'

/** The language contents are written in; its audio length becomes the content's. */
const SOURCE_LOCALE = 'en'

/**
 * Generates (or refreshes) the read-aloud MP3 of one content in one locale
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
  { contentId, locale }: { contentId: string; locale: string },
): Promise<{ status: 'no-text' | 'up-to-date' | 'generated'; seconds?: number }> {
  const { payload } = req
  const content = await payload.findByID({
    collection: 'contents',
    id: contentId,
    locale: locale as 'en',
    fallbackLocale: false,
    depth: 0,
    select: { title: true, body: true },
    overrideAccess: true,
    req,
  })
  if (!content.body) return { status: 'no-text' }
  const text = contentAudioText(content)
  const textHash = audioTextHash(text)

  const { docs } = await payload.find({
    collection: 'contentAudio',
    where: { and: [{ content: { equals: contentId } }, { locale: { equals: locale } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const existing = docs[0]
  if (existing?.textHash === textHash) return { status: 'up-to-date' }

  // One speech request per chunk, in order; the MP3s are joined (see MAX_CHUNK_CHARS).
  const fishAudio = createFishAudio({ apiKey: process.env.FISH_API_KEY })
  const parts: Uint8Array[] = []
  for (const chunk of splitForSpeech(text)) {
    const { audio } = await generateSpeech({
      model: fishAudio.speech(AUDIO_MODEL),
      text: chunk,
      voice: AUDIO_VOICE,
      outputFormat: 'mp3',
    })
    parts.push(audio.uint8Array)
  }
  const data = Buffer.concat(parts)
  const seconds = mp3DurationSeconds(data)
  const file = {
    data,
    mimetype: 'audio/mpeg',
    name: `content-${contentId}-${locale}.mp3`,
    size: data.length,
  }
  const fields = {
    content: contentId,
    locale,
    textHash,
    durationSeconds: seconds,
    model: AUDIO_MODEL,
    voice: AUDIO_VOICE,
  }
  if (existing) {
    await payload.update({
      collection: 'contentAudio',
      id: existing.id,
      data: fields,
      file,
      overrideAccess: true,
      req,
    })
  } else {
    await payload.create({
      collection: 'contentAudio',
      data: fields,
      file,
      overrideAccess: true,
      req,
    })
  }

  // The real length of the source audio replaces the word-count estimate.
  if (locale === SOURCE_LOCALE && seconds) {
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

export const generateContentAudioTask: TaskConfig<'generateContentAudio'> = {
  slug: 'generateContentAudio',
  label: 'Read a content aloud (text to speech)',
  inputSchema: [
    { name: 'contentId', type: 'text', required: true },
    { name: 'locale', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'status', type: 'text', required: true },
    { name: 'seconds', type: 'number' },
  ],
  retries: 2,
  handler: async ({ input, req }) => ({ output: await generateContentAudio(req, input) }),
}
