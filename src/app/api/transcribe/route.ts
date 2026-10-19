import { allowRequest } from '@/lib/rate-limit'
import { createGroq } from '@ai-sdk/groq'
import { transcribe } from 'ai'
import { NextResponse } from 'next/server'

/**
 * Speech to text for form fields (the "Plan my visit" interests): recorded
 * audio in, plain text out. Unlike `/api/assistant`, nothing is interpreted
 * or run; the visitor sees the text in the field and can edit it.
 */
export const runtime = 'nodejs'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
/** About a minute of compressed browser audio. */
const MAX_AUDIO_BYTES = 2_000_000

export async function POST(request: Request) {
  if (!allowRequest(request, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const form = await request.formData()
  const audio = form.get('audio')
  if (!(audio instanceof Blob) || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    const { text } = await transcribe({
      model: groq.transcription('whisper-large-v3-turbo'),
      audio: new Uint8Array(await audio.arrayBuffer()),
    })
    return NextResponse.json({ text: text.trim() })
  } catch (error) {
    console.error('Transcription failed', error)
    return NextResponse.json({ error: 'Transcription unavailable' }, { status: 502 })
  }
}
