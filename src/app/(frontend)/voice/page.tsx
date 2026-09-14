import VoiceAgent from '@/components/voice/VoiceAgent'

export default function VoicePage() {
  return (
    <div className="home">
      <div className="content">
        <h1>Voice assistant</h1>
        <p>Talk to the prototype agent. No login needed.</p>
        <VoiceAgent />
      </div>
    </div>
  )
}
