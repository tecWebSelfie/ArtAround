import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { createHash } from 'node:crypto'
import type { Content } from '@/payload-types'

/**
 * Read-aloud audio of a content's base text (requirement 4 of
 * `docs/plan/requisiti-18-33.md`): the pure parts shared by the
 * `generateContentAudio` task, the `contents` hook that queues it and the
 * `/api/content-audio/[id]` route that serves it.
 *
 * One MP3 per content and locale lives in the `contentAudio` upload
 * collection. Its `textHash` fingerprints the text it reads (plus the voice
 * and model), so an edited text — or a refreshed translation — makes the
 * stored audio stale and the next request generates it again.
 */

/** The Fish Audio voice and model `/api/speech` and the LiveKit agent use. */
export const AUDIO_VOICE = '933563129e564b19a115bedd57b7406a'
export const AUDIO_MODEL = 's2.1-pro-free'

/** Jobs queue the audio tasks run on (`jobs.autoRun` in `payload.config.ts`). */
export const AUDIO_QUEUE = 'speech'

/**
 * Longest text sent in one speech request. Long bodies are read in several
 * requests, split at paragraph (then sentence) boundaries, and the MP3s are
 * joined: MPEG audio frames are self-contained, so concatenation plays as one.
 */
export const MAX_CHUNK_CHARS = 1_500

/** Fingerprint of what an audio file reads; a different one means stale audio. */
export const audioTextHash = (text: string) =>
  createHash('sha256').update(`${AUDIO_MODEL}\n${AUDIO_VOICE}\n${text.trim()}`).digest('hex')

/** The title, then the body: what a visitor hears when they press "Listen". */
export const audioText = (title: string, body: string) =>
  [title.trim(), body.trim()].filter(Boolean).join('.\n\n')

/**
 * What a content's audio reads, from its stored title and rich text. The
 * task that writes the audio and the route that serves it both use this, so
 * the fingerprints they compare are always built the same way.
 */
export const contentAudioText = (content: Pick<Content, 'title' | 'body'>) =>
  audioText(content.title ?? '', convertLexicalToPlaintext({ data: content.body }))

/** Splits the text into speech requests of at most `max` characters. */
export function splitForSpeech(text: string, max = MAX_CHUNK_CHARS): string[] {
  const chunks: string[] = []
  let current = ''
  const push = (piece: string) => {
    if (!current) current = piece
    else if (current.length + 1 + piece.length <= max) current = `${current}\n${piece}`
    else {
      chunks.push(current)
      current = piece
    }
  }
  for (const paragraph of text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    if (paragraph.length <= max) push(paragraph)
    // A paragraph longer than a request: split it at sentence ends.
    else
      for (const sentence of paragraph.match(/[^.!?]+[.!?]*\s*/g) ?? [paragraph])
        push(sentence.trim())
  }
  if (current) chunks.push(current)
  return chunks
}

// MPEG audio frame header tables (ISO 11172-3 / 13818-3), enough to time an MP3.
const BITRATES_KBPS: Record<string, number[]> = {
  // [version][layer] → index 1..14
  'v1-l3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  'v2-l3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
}

/** Bytes to skip at the start: an ID3v2 tag, if any. */
function id3Size(bytes: Uint8Array) {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0
  return 10 + ((bytes[6]! << 21) | (bytes[7]! << 14) | (bytes[8]! << 7) | bytes[9]!)
}

/**
 * Length in seconds of an MP3 (layer III, any bitrate, constant or
 * variable), by walking its frame headers. Returns 0 when nothing parses.
 */
export function mp3DurationSeconds(bytes: Uint8Array): number {
  let offset = id3Size(bytes)
  let seconds = 0
  while (offset + 4 <= bytes.length) {
    const b1 = bytes[offset + 1]!
    const b2 = bytes[offset + 2]!
    const isFrame = bytes[offset] === 0xff && (b1 & 0xe0) === 0xe0
    const version = (b1 >> 3) & 0b11 // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (b1 >> 1) & 0b11 // 1 = layer III
    const bitrateIndex = b2 >> 4
    const rateIndex = (b2 >> 2) & 0b11
    if (
      !isFrame ||
      layer !== 1 ||
      version === 1 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      rateIndex === 3
    ) {
      offset++
      continue
    }
    const bitrate = BITRATES_KBPS[version === 3 ? 'v1-l3' : 'v2-l3']![bitrateIndex]! * 1000
    const sampleRate = SAMPLE_RATES[version]![rateIndex]!
    const samples = version === 3 ? 1152 : 576
    const padding = (b2 >> 1) & 1
    const frameLength = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding
    if (frameLength < 4) break
    seconds += samples / sampleRate
    offset += frameLength
  }
  return Math.round(seconds)
}
