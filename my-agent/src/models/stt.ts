import { STT as assemblyaiStt } from '@livekit/agents-plugin-assemblyai';
import { STT as openaiStt } from '@livekit/agents-plugin-openai';

// Factories: called inside entry, after dotenv.config() has loaded .env.local.
// Top-level `new STT(...)` would throw on missing *_API_KEY at import time.
// NOTE: apiKey is passed explicitly (not left to plugin defaults) because the
// AssemblyAI plugin snapshots process.env at module import — before dotenv
// runs — so its default would stay undefined even with a valid .env.local.
export function createUniversal_3_5Pro() {
  return new assemblyaiStt({
    apiKey: process.env.ASSEMBLYAI_API_KEY || '',
    speechModel: 'universal-3-5-pro',
    minTurnSilence: 100,
    maxTurnSilence: 1000,
    vadThreshold: 0.3,
  });
}

export function createWhisperLargeV3Turbo() {
  return openaiStt.withGroq({
    model: 'whisper-large-v3-turbo',
    apiKey: process.env.GROQ_API_KEY || '',
  });
}
