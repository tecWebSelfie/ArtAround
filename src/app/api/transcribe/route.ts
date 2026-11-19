import { allowRequest } from '@/lib/rate-limit'
import { transcriptionModel } from '@/lib/ai-models'
import { transcribe } from 'ai'
import { NextResponse } from 'next/server'

/**
 * Speech to text for form fields (the "Plan my visit" interests): recorded
 * audio in, plain text out. Unlike `/api/assistant`, nothing is interpreted
 * or run; the visitor sees the text in the field and can edit it.
 */
export const runtime = 'nodejs'

/** About a minute of compressed browser audio. */
const MAX_AUDIO_BYTES = 2_000_000

export async function POST(request: Request) {
  if (!allowRequest(request, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  // Not multipart/form-data: formData() throws, answer 400 instead of a 500 (nightly N11).
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const audio = form.get('audio')
  if (!(audio instanceof Blob) || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    const { text } = await transcribe({
      model: await transcriptionModel(),
      audio: new Uint8Array(await audio.arrayBuffer()),
    })
    return NextResponse.json({ text: text.trim() })
  } catch (error) {
    console.error('Transcription failed', error)
    return NextResponse.json({ error: 'Transcription unavailable' }, { status: 502 })
  }
}
