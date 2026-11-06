import { generateSpeech, generateText, Output, streamText, transcribe } from 'ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { mockSpeechModel, mockTextModel, mockTranscriptionModel, TRANSCRIPT } from '@/lib/ai-mock'
import { mp3DurationSeconds } from '@/lib/content-audio'

// The AI_MOCK=true models (src/lib/ai-mock.ts) that the e2e suite runs on in
// CI: each answer has to go through the same AI SDK calls the routes make.

describe('AI mock models', () => {
  it('chooses the command whose label matches the request, as the assistant asks', async () => {
    const ids = ['nav:next', 'content:abc', 'content:def']
    const { output } = await generateText({
      model: mockTextModel('test'),
      output: Output.object({
        schema: z.object({ reply: z.string(), commandId: z.enum(['none', ...ids]) }),
      }),
      system: [
        'Available commands (id: label, kind):',
        'nav:next: Next stop, navigation',
        'content:abc: Opening hours, content',
        'content:def: [DEV] Side discovery, content',
      ].join('\n'),
      prompt: TRANSCRIPT,
    })
    expect(output.commandId).toBe('content:def')
    expect(output.reply).not.toBe('')
  })

  it('fills a tour plan with offered content ids only', async () => {
    const candidates = ['c1', 'c2', 'c3', 'c4']
    const { output } = await generateText({
      model: mockTextModel('test'),
      output: Output.object({
        schema: z.object({
          title: z.string(),
          description: z.string(),
          contentIds: z.array(z.enum(candidates)),
        }),
      }),
      prompt: 'Something for curious kids',
    })
    expect(output.contentIds.length).toBeGreaterThan(0)
    expect(output.contentIds.every((id) => candidates.includes(id))).toBe(true)
  })

  it('streams Markdown paragraphs for an expansion', async () => {
    const result = streamText({ model: mockTextModel('test'), prompt: 'Tell me more' })
    expect((await result.text).split('\n\n')).toHaveLength(2)
  })

  it('transcribes to the e2e request and speaks a timed MP3', async () => {
    const { text } = await transcribe({
      model: mockTranscriptionModel('test'),
      audio: new Uint8Array(8),
    })
    expect(text).toBe(TRANSCRIPT)
    const { audio } = await generateSpeech({ model: mockSpeechModel('test'), text: 'Hello' })
    expect(mp3DurationSeconds(audio.uint8Array)).toBe(1)
  })
})
