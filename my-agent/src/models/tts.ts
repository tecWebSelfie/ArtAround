import { TTS as fishaudio } from '@livekit/agents-plugin-fishaudio';

// Factory: called inside entry, after dotenv.config() has loaded .env.local.
// apiKey passed explicitly so construction can't depend on plugin import order.
// Uses s2.1-pro-free: same model as paid s2.1-pro at $0 under fair use.
// Trade-offs: no SLA/TTFA/DPA guarantees, requests may train models.
// Switch back to 's2.1-pro' for production commercial use.
export function createFishAudio2_1ProFree() {
  return new fishaudio({
    apiKey: process.env.FISH_API_KEY || '',
    model: 's2.1-pro-free',
    voiceId: '933563129e564b19a115bedd57b7406a',
  });
}