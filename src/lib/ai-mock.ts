import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4, MockSpeechModelV4, MockTranscriptionModelV4 } from 'ai/test'
import { silentMp3 } from './content-audio'

/**
 * Fake AI models for `AI_MOCK=true` (src/lib/ai-models.ts), built on the AI
 * SDK's own test models (`ai/test`): the app's code runs unchanged (prompts,
 * structured output parsing, streaming, saving), only the provider answers
 * are canned. Used by the e2e suite in CI, so it needs no Groq/Fish keys and
 * every run gets the same answers.
 *
 * The answers are generic, not per route:
 * - plain text: two short Markdown paragraphs, streamed word by word;
 * - structured output (`Output.object`): a value built from the JSON schema
 *   the AI SDK sends. Where the schema offers a choice (an `enum` of ids),
 *   the mock picks the option whose line in the prompt shares the most words
 *   with the visitor's message, so the assistant "understands" a request the
 *   way the real model would for the e2e phrases;
 * - transcription: one fixed sentence (TRANSCRIPT), what the e2e WAV says;
 * - speech: about a second of silent MP3 (mp3DurationSeconds rounds to whole seconds).
 */

type CallOptions = Parameters<MockLanguageModelV4['doGenerate']>[0]
type Schema = {
  type?: string
  enum?: unknown[]
  properties?: Record<string, Schema>
  items?: Schema
}

/** What the fake speech to text "hears": the request in tests/e2e/fixtures/open-side-discovery.wav. */
const TRANSCRIPT = 'Open the side discovery.'

const TEXT = [
  'This is a **mocked** answer (`AI_MOCK=true`): the app ran its real request, and the AI SDK test model replied.',
  'A second paragraph keeps the layout honest, as a real answer would have more than one.',
].join('\n\n')

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
}
const finishReason = { unified: 'stop' as const, raw: undefined }

/** All text of one role in the prompt (system strings, user text parts). */
function promptText(options: CallOptions, role: 'system' | 'user'): string {
  return options.prompt
    .filter((message) => message.role === role)
    .map((message) =>
      typeof message.content === 'string'
        ? message.content
        : message.content.map((part) => ('text' in part ? part.text : '')).join(' '),
    )
    .join('\n')
}

const words = (text: string) => new Set(text.toLowerCase().match(/\p{L}{3,}/gu) ?? [])

/**
 * The enum option whose prompt line (`id: label, …`) shares the most words
 * with the visitor's message; the first real option when none does. "none"
 * only when it is the sole choice. The assistant and plan-tour prompts list
 * their choices as such `id:` lines: keep that shape, or CI's mock answers
 * stop matching.
 */
function pickOption(values: string[], call: CallOptions): string {
  const choices = values.filter((value) => value !== 'none')
  if (!choices.length) return values[0] ?? ''
  const user = promptText(call, 'user')
  const asked = words(user)
  const lines = `${promptText(call, 'system')}\n${user}`.split('\n')
  let best = choices[0]!
  let bestScore = 0
  for (const choice of choices) {
    const line = lines.find((candidate) => candidate.startsWith(`${choice}:`)) ?? ''
    const score = [...words(line)].filter((word) => asked.has(word)).length
    if (score > bestScore) [best, bestScore] = [choice, score]
  }
  return best
}

/**
 * A value that satisfies `schema`, built the way a model would fill it. It
 * covers what the routes' `Output.object` schemas use (objects of strings,
 * enums and lists of enums); extend it when a schema needs more.
 */
function fakeValue(schema: Schema, key: string, call: CallOptions): unknown {
  if (schema.enum?.length) return pickOption(schema.enum.map(String), call)
  if (schema.type === 'object') {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([name, property]) => [
        name,
        fakeValue(property, name, call),
      ]),
    )
  }
  // A list of ids: the first few real options, like a short selection.
  if (schema.type === 'array') {
    return (schema.items?.enum ?? [])
      .map(String)
      .filter((id) => id !== 'none')
      .slice(0, 3)
  }
  return `Mocked ${key}`
}

export function mockTextModel(modelId: string) {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId,
    doGenerate: async (options) => {
      const text =
        options.responseFormat?.type === 'json' && options.responseFormat.schema
          ? JSON.stringify(fakeValue(options.responseFormat.schema as Schema, 'value', options))
          : TEXT
      return { content: [{ type: 'text', text }], finishReason, usage, warnings: [] }
    },
    doStream: async () => ({
      stream: simulateReadableStream({
        // Word by word with a short pause: the browser sees a real stream.
        chunkDelayInMs: 5,
        chunks: [
          { type: 'text-start', id: 'text-1' },
          ...TEXT.split(/(?<= )/).map((delta) => ({
            type: 'text-delta' as const,
            id: 'text-1',
            delta,
          })),
          { type: 'text-end', id: 'text-1' },
          { type: 'finish', finishReason, usage },
        ],
      }),
    }),
  })
}

export function mockTranscriptionModel(modelId: string) {
  return new MockTranscriptionModelV4({
    provider: 'mock',
    modelId,
    doGenerate: async () => ({
      text: TRANSCRIPT,
      segments: [{ text: TRANSCRIPT, startSecond: 0, endSecond: 2 }],
      language: 'en',
      durationInSeconds: 2,
      warnings: [],
      response: { timestamp: new Date(), modelId },
    }),
  })
}

export function mockSpeechModel(modelId: string) {
  return new MockSpeechModelV4({
    provider: 'mock',
    modelId,
    doGenerate: async () => ({
      audio: silentMp3(40),
      warnings: [],
      response: { timestamp: new Date(), modelId },
    }),
  })
}
