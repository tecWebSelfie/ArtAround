import { AUDIO_MODEL, AUDIO_VOICE } from '@/lib/content-audio'
import { allowRequest } from '@/lib/rate-limit'
import { speechModel } from '@/lib/ai-models'
import { generateSpeech } from 'ai'
import { NextResponse } from 'next/server'

/**
 * Text-to-speech for the assistant's replies and spoken directions: text in,
 * MP3 out. Uses the same Fish Audio voice as the LiveKit agent (`my-agent`).
 * The browser plays the audio through an analyser so the orb follows it.
 */
export const runtime = 'nodejs'

// Voice and model are shared with the contents' read-aloud audio
// (src/lib/content-audio.ts); Fish Audio, or the mock under AI_MOCK=true
// (src/lib/ai-models.ts).

export async function POST(request: Request) {
  if (!allowRequest(request, 40)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { text } = (await request.json().catch(() => ({}))) as { text?: unknown }
  if (typeof text !== 'string' || !text.trim() || text.length > 600) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    const { audio } = await generateSpeech({
      model: await speechModel(AUDIO_MODEL),
      text,
      voice: AUDIO_VOICE,
      outputFormat: 'mp3',
    })
    return new Response(Buffer.from(audio.uint8Array), {
      headers: { 'Content-Type': audio.mediaType || 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Speech request failed', error)
    return NextResponse.json({ error: 'Speech unavailable' }, { status: 502 })
  }
}
