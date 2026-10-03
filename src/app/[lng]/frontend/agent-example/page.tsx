'use client'

import { useSession } from '@livekit/components-react'
import { TokenSource } from 'livekit-client'
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider'
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar'

const TOKEN_SOURCE = TokenSource.endpoint('/api/token')

export default function Controls() {
  const session = useSession(TOKEN_SOURCE)

  return (
    <AgentSessionProvider session={session}>
      <AgentControlBar
        variant="livekit"
        isChatOpen={false}
        isConnected={true}
        controls={{
          microphone: true,
          camera: true,
          screenShare: true,
          chat: true,
          leave: true,
        }}
      />
    </AgentSessionProvider>
  )
}
