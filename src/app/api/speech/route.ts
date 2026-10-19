import { allowRequest } from '@/lib/rate-limit'
import { createFishAudio } from '@ai-sdk/fish-audio'
import { generateSpeech } from 'ai'
import { NextResponse } from 'next/server'

/**
 * Text-to-speech for the assistant's replies and spoken directions: text in,
 * MP3 out. Uses the same Fish Audio voice as the LiveKit agent (`my-agent`).
 * The browser plays the audio through an analyser so the orb follows it.
 */
export const runtime = 'nodejs'

// `FISH_API_KEY` is the name the LiveKit agent already uses in `.env`. The free
// tier (`s2.1-pro-free`) matches the agent; switch to `s2.1-pro` for production SLAs.
const fishAudio = createFishAudio({ apiKey: process.env.FISH_API_KEY })
const VOICE_ID = '933563129e564b19a115bedd57b7406a'

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
      model: fishAudio.speech('s2.1-pro-free'),
      text,
      voice: VOICE_ID,
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
