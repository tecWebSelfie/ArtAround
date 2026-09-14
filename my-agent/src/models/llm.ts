import { type GroqChatModels, LLM as openai } from '@livekit/agents-plugin-openai';

export const MuseSpark1_3 = new openai(
  {
    baseURL: process.env.OPENCODE_URL || 'https://opencode.ai/zen/v1',
    apiKey: process.env.OPENCODE_KEY || '',
    model: 'muse-spark-1.3-contributor-free',
  },
  'openai.responses',
);

export const GPTOSS = openai.withGroq({
  model: 'openai/gpt-oss-120b' as GroqChatModels,
});
