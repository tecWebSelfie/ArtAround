import { type GroqChatModels, LLM as openai } from '@livekit/agents-plugin-openai';

// Factories (not top-level instances): ESM imports are evaluated before
// dotenv.config() in main.ts, so constructing here would miss .env.local
// values and throw "Missing credentials" on `lk agent console` startup.
// These are called inside entry/createAgent, after env is loaded.
export function createMuseSpark1_3() {
  return new openai(
    {
      baseURL: process.env.OPENCODE_URL || 'https://opencode.ai/zen/v1',
      apiKey: process.env.OPENCODE_KEY || '',
      model: 'muse-spark-1.3-contributor-free',
    },
    'openai.responses',
  );
}

export function createGPTOSS() {
  return openai.withGroq({
    model: 'openai/gpt-oss-120b' as GroqChatModels,
    apiKey: process.env.GROQ_API_KEY || '',
  });
}
