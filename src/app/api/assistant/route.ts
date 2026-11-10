import { allowRequest } from '@/lib/rate-limit'
import { matchControlledCommand } from '@/lib/voice-vocabulary'
import { textModel, transcriptionModel } from '@/lib/ai-models'
import { generateText, Output, transcribe } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * One voice turn of the navigation assistant:
 *
 *   recorded speech (WAV) → Groq Whisper transcript → one language-model call
 *   that fills { reply, commandId } → JSON back to the browser
 *
 * Both models come from src/lib/ai-models.ts (mocked under AI_MOCK=true).
 *
 * The browser sends the commands it can run right now (the same list as the
 * navigation search). The model only *chooses* one of their ids; the browser
 * runs it, so there are no tool round-trips between servers.
 *
 * The controlled vocabulary comes first (`src/lib/voice-vocabulary.ts`): a
 * transcript that is one of its fixed phrases ("avanti", "chi è l'autore?")
 * runs its command without asking the model.
 */
export const runtime = 'nodejs'

/** About 30 s of 16 kHz mono WAV; longer recordings are not commands. */
const MAX_AUDIO_BYTES = 1_000_000

const CommandList = z
  .array(z.object({ id: z.string(), label: z.string(), description: z.string() }))
  .max(500)

export async function POST(request: Request) {
  if (!allowRequest(request, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const form = await request.formData()
  const audio = form.get('audio')
  const commands = CommandList.safeParse(JSON.parse(String(form.get('commands') ?? '[]')))
  const language = String(form.get('language') ?? 'en')
  const context = String(form.get('context') ?? '').slice(0, 2_000)
  if (!(audio instanceof Blob) || audio.size > MAX_AUDIO_BYTES || !commands.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const { text: transcript } = await transcribe({
      model: await transcriptionModel(),
      audio: new Uint8Array(await audio.arrayBuffer()),
    })
    if (!transcript.trim()) return NextResponse.json({ transcript, reply: '', commandId: null })

    const ids = commands.data.map((command) => command.id)
    const controlled = matchControlledCommand(transcript, ids)
    if (controlled) return NextResponse.json({ transcript, reply: '', commandId: controlled })
    const { output } = await generateText({
      model: await textModel(),
      // The schema is the whole contract: a short spoken reply, plus either
      // one of the offered command ids or "none".
      output: Output.object({
        schema: z.object({
          reply: z.string().describe('One or two short spoken sentences, no markdown.'),
          commandId: z.enum(['none', ...ids]),
        }),
      }),
      system: [
        'You are the voice guide of a museum navigation app.',
        'The visitor speaks a request. If one of the available commands does what they ask,',
        'choose its id and say in one sentence what you are doing. Otherwise choose "none"',
        'and answer briefly using only the context given. Never invent rooms, objects or',
        'directions that are not in the commands or the context.',
        `Reply in the language with code "${language}".`,
        `Context: ${context}`,
        // `id: label` lines: the AI_MOCK model matches the request against them (src/lib/ai-mock.ts).
        'Available commands (id: label, kind):',
        ...commands.data.map(
          (command) => `${command.id}: ${command.label}, ${command.description}`,
        ),
      ].join('\n'),
      prompt: transcript,
    })
    return NextResponse.json({
      transcript,
      reply: output.reply,
      commandId: output.commandId === 'none' ? null : output.commandId,
    })
  } catch (error) {
    console.error('Assistant request failed', error)
    return NextResponse.json({ error: 'Assistant unavailable' }, { status: 502 })
  }
}
