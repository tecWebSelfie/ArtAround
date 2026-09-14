import { STT as assemblyaiStt } from '@livekit/agents-plugin-assemblyai';
import { STT as openaiStt } from '@livekit/agents-plugin-openai';

export const Universal_3_5Pro = new assemblyaiStt({
  speechModel: 'universal-3-5-pro',
  minTurnSilence: 100,
  maxTurnSilence: 1000,
  vadThreshold: 0.3,
});

export const WhisperLargeV3Turbo = openaiStt.withGroq({
  model: 'whisper-large-v3-turbo',
});
