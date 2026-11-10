import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4, MockTranscriptionModelV4 } from 'ai/test'

/**
 * Voice commands in natural language (course brief, Navigator 18-33: "accept
 * voice commands, besides the controlled vocabulary, in natural language; the
 * system then maps them onto one of the available commands", and the same in
 * the visitor's language). The seam is `POST /api/assistant`: recorded speech
 * in, `{ transcript, reply, commandId }` out.
 *
 * Only the system boundary is faked, with the AI SDK's own test models
 * (`ai/test`): the speech-to-text model "hears" `heard`, and the language
 * model answers `modelAnswer`. The route's own contract is what is under
 * test: which commands the model may choose, what reaches the browser, and
 * that the controlled vocabulary never costs a model call.
 */
vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  heard: '',
  modelAnswer: { reply: '', commandId: 'none' } as { reply: string; commandId: string },
  modelCalls: 0,
  systemPrompts: [] as string[],
}))

vi.mock('@/lib/ai-models', () => ({
  transcriptionModel: async () =>
    new MockTranscriptionModelV4({
      doGenerate: async () => ({
        text: state.heard,
        segments: [],
        language: undefined,
        durationInSeconds: 1,
        warnings: [],
        response: { timestamp: new Date(), modelId: 'mock' },
      }),
    }),
  textModel: async () =>
    new MockLanguageModelV4({
      doGenerate: async (options) => {
        state.modelCalls++
        state.systemPrompts.push(
          options.prompt
            .filter((message) => message.role === 'system')
            .map((message) => String(message.content))
            .join('\n'),
        )
        return {
          content: [{ type: 'text', text: JSON.stringify(state.modelAnswer) }],
          finishReason: { unified: 'stop', raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
            outputTokens: { total: 1, text: 1, reasoning: undefined },
          },
          warnings: [],
        }
      },
    }),
}))

const { POST } = await import('@/app/api/assistant/route')

/** The commands the navigation offers during a tour (a subset, same shape the browser sends). */
const TOUR_COMMANDS = [
  { id: 'next-stop', label: 'Next stop', description: 'Tour' },
  { id: 'previous-stop', label: 'Previous stop', description: 'Tour' },
  { id: 'version:simpler', label: 'Simpler', description: 'Reading options' },
  { id: 'author', label: 'Who is the author', description: 'Artwork' },
]

async function ask({
  commands = TOUR_COMMANDS,
  language = 'it',
}: { commands?: typeof TOUR_COMMANDS; language?: string } = {}) {
  const form = new FormData()
  form.set('audio', new Blob([new Uint8Array(16)], { type: 'audio/wav' }))
  form.set('commands', JSON.stringify(commands))
  form.set('language', language)
  const response = await POST(
    new Request('http://test/api/assistant', {
      method: 'POST',
      // A fresh client each call: the route's per-IP limiter must not interfere.
      headers: { 'x-forwarded-for': crypto.randomUUID() },
      body: form,
    }),
  )
  return { status: response.status, body: await response.json() }
}

describe('natural-language voice commands', () => {
  beforeEach(() => {
    state.modelCalls = 0
    state.systemPrompts = []
  })

  it.each([
    ['E adesso?', 'next-stop'],
    ['Non ho capito niente', 'version:simpler'],
    ['Et maintenant ?', 'next-stop'],
  ])('maps "%s" onto the command the model picks (%s)', async (said, command) => {
    state.heard = said
    state.modelAnswer = { reply: 'Ok.', commandId: command }

    const { status, body } = await ask()

    expect(status).toBe(200)
    expect(body).toEqual({ transcript: said, reply: 'Ok.', commandId: command })
  })

  it('offers the model exactly the commands available now, in the visitor’s language', async () => {
    state.heard = 'E adesso?'
    state.modelAnswer = { reply: 'Ok.', commandId: 'next-stop' }

    await ask({ language: 'fr' })

    const [system] = state.systemPrompts
    for (const { id } of TOUR_COMMANDS) expect(system).toContain(`${id}:`)
    expect(system).not.toContain('service-type:')
    expect(system).toContain('"fr"')
  })

  it('runs no command when the model finds none, and still answers', async () => {
    state.heard = 'Che bel colore!'
    state.modelAnswer = { reply: 'È un rosso cinabro.', commandId: 'none' }

    const { body } = await ask()

    expect(body).toEqual({
      transcript: 'Che bel colore!',
      reply: 'È un rosso cinabro.',
      commandId: null,
    })
  })

  it('never runs a command the navigation did not offer', async () => {
    state.heard = 'Portami al bar'
    // A model that "hallucinates" a command missing from the list.
    state.modelAnswer = { reply: 'Ok.', commandId: 'service-type:food' }
    // The schema rejects the answer and the route logs it: expected here.
    vi.spyOn(console, 'error').mockImplementationOnce(() => {})

    const { body } = await ask()

    expect(body.commandId ?? null).toBeNull()
  })

  it('answers a controlled-vocabulary phrase without calling the model', async () => {
    state.heard = 'Avanti!'

    const { body } = await ask()

    expect(body.commandId).toBe('next-stop')
    expect(state.modelCalls).toBe(0)
  })
})
