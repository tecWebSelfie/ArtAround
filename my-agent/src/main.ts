import { ServerOptions, cli, defineAgent, inference, stt, tts, voice } from '@livekit/agents';
import * as silero from '@livekit/agents-plugin-silero';
import { audioEnhancement } from '@livekit/plugins-ai-coustics';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent } from './agent.ts';
import { createUniversal_3_5Pro, createWhisperLargeV3Turbo } from './models/stt.ts';
import { createFishAudio2_1ProFree } from './models/tts.ts';

// Load environment variables from a local file.
// Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
// when running locally or self-hosting your agent server.
dotenv.config({ path: '.env.local' });

export default defineAgent({
  prewarm: async (proc) => {
    // Prewarm the Silero VAD model so it's ready to go when the first user joins
    proc.userData.vad = await silero.VAD.load({
      minSpeechDuration: 100, // ignore blips/coughs, default 50 too eager
      minSilenceDuration: 600, // close utterance after 600ms silence — whole phrases, not fragments
      prefixPaddingDuration: 400, // keep word onsets, Whisper hates clipped starts
      maxBufferedSpeech: 30_000, // Whisper window ~30s, don't buffer past it
      activationThreshold: 0.6, // fewer noise triggers; default 0.5
    });
  },
  entry: async (ctx) => {
    // Factories are instantiated here (after dotenv.config above) so
    // .env.local keys (GROQ_API_KEY, ASSEMBLYAI_API_KEY, FISH_API_KEY, ...) are visible.
    // Fail-fast: a missing/empty key throws the plugin's own error and aborts
    // startup — no degraded sessions with silently skipped providers.
    // Order is cost intent: Groq Whisper primary (permanent free tier, no card),
    // AssemblyAI fallback ($50 finite credits, billed per WebSocket-open time).
    const sttInstances = [createWhisperLargeV3Turbo(), createUniversal_3_5Pro()];

    const ttsInstances = [createFishAudio2_1ProFree()];

    // Set up a voice AI pipeline using AssemblyAI, Fish Audio, and the LiveKit turn detector
    const session = new voice.AgentSession({
      // Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
      // See all available models at https://docs.livekit.io/agents/models/stt/
      stt: new stt.FallbackAdapter({
        sttInstances,
        vad: ctx.proc.userData.vad! as silero.VAD,
      }),

      // Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
      // See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
      tts: new tts.FallbackAdapter({
        ttsInstances,
      }),

      turnHandling: {
        // Turn detection determines when the user is speaking and when the agent should respond.
        // The LiveKit audio turn detector is a multimodal model that encodes the user's audio
        // directly to predict end of turn. It's built into the SDK (no extra plugin) and
        // AgentSession supplies the required VAD automatically.
        // See more at https://docs.livekit.io/agents/logic/turns/turn-detector/
        turnDetection: new inference.TurnDetector(),
        // Adaptive interruptions use the turn detector to tell a real interruption from a
        // backchannel like "mhm" or "right", so the agent keeps talking through the latter.
        interruption: { mode: 'adaptive' },
        // Allow the LLM to generate a response while waiting for the end of turn
        preemptiveGeneration: { enabled: true },
      },

      // Expressive mode injects the TTS provider's markup guide into the LLM prompt, so the model
      // emits inline delivery tags (emotion, pacing, non-verbal sounds) that the TTS renders and
      // the transcript never shows. Requires a TTS model that supports markup, such as the Fish
      // Audio model above.
      expressive: true,
    });

    // Start the session, which initializes the voice pipeline and warms up the models
    await session.start({
      agent: createAgent(),
      room: ctx.room,
      inputOptions: {
        // ai-coustics QUAIL audio enhancement for noise cancellation
        // Works for both WebRTC and telephony (SIP) participants
        noiseCancellation: audioEnhancement({ model: 'quailL' }), //quailL sopprime rumori e non le altre voci, ma è gratis
      },
    });

    // // Add a virtual avatar to the session, if desired
    // // For other providers, see https://docs.livekit.io/agents/models/avatar/
    // const avatar = new anam.AvatarSession({
    //   personaConfig: {
    //     name: '...',
    //     avatarId: '...', // See https://docs.livekit.io/agents/models/avatar/plugins/anam
    //   },
    // });
    // // Start the avatar and wait for it to join
    // await avatar.start(session, ctx.room);

    // Join the room and connect to the user
    await ctx.connect();

    // Greet the user on joining
    session.generateReply({
      instructions: 'Greet the user in a helpful and friendly manner.',
    });
  },
});

// Run the agent server
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'my-agent',
  }),
);
