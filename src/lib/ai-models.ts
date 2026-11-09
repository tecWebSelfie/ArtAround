import { createFishAudio } from '@ai-sdk/fish-audio'
import { createGroq } from '@ai-sdk/groq'
import type { LanguageModel, SpeechModel, TranscriptionModel } from 'ai'

/**
 * The one place the server picks its AI models: Groq for text and speech to
 * text, Fish Audio for text to speech. Every route and task asks here instead
 * of building its own provider; the translator plugin (src/plugins/autoTranslate.ts)
 * has its own OpenAI-compatible client but shares TEXT_MODEL.
 *
 * `AI_MOCK=true` swaps them for the AI SDK's own mock models (`ai/test`,
 * see src/lib/ai-mock.ts): deterministic answers, no API keys, no cost. The
 * CI workflow sets it, and Playwright sets it on the `pnpm start` server it
 * launches (playwright.config.ts); a `next dev` you started yourself keeps
 * the real providers. Never set it in a deployment: the server logs a loud
 * warning at startup if it is on.
 *
 * Getters are async because the mocks are a dynamic import: a server that
 * isn't mocking never loads `ai/test`.
 */
const AI_MOCKED = process.env.AI_MOCK === 'true'
if (AI_MOCKED) {
  console.warn('[ai-models] AI_MOCK=true: AI responses are mocked (src/lib/ai-mock.ts).')
}

/** The language model behind expansions, tour planning and the assistant. */
export const TEXT_MODEL = 'openai/gpt-oss-120b'
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
// `FISH_API_KEY` is the name the LiveKit agent (`my-agent`) already uses.
const fishAudio = createFishAudio({ apiKey: process.env.FISH_API_KEY })

export async function textModel(): Promise<LanguageModel> {
  return AI_MOCKED ? (await import('./ai-mock')).mockTextModel(TEXT_MODEL) : groq(TEXT_MODEL)
}

export async function transcriptionModel(): Promise<TranscriptionModel> {
  return AI_MOCKED
    ? (await import('./ai-mock')).mockTranscriptionModel(TRANSCRIPTION_MODEL)
    : groq.transcription(TRANSCRIPTION_MODEL)
}

/**
 * Whether text to speech can run: a Fish Audio key, or the mocks. Read at
 * call time, like the key, so tests can switch either with `vi.stubEnv`.
 */
export const speechAvailable = () =>
  process.env.AI_MOCK === 'true' || Boolean(process.env.FISH_API_KEY)

export async function speechModel(modelId: string): Promise<SpeechModel> {
  return AI_MOCKED
    ? (await import('./ai-mock')).mockSpeechModel(modelId)
    : fishAudio.speech(modelId)
}
