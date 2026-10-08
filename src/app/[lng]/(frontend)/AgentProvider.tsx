'use client'

import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider'
import { useSession } from '@livekit/components-react'
import { TokenSource } from 'livekit-client'

const TOKEN_SOURCE = TokenSource.endpoint('/api/token')

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const session = useSession(TOKEN_SOURCE)

  return <AgentSessionProvider session={session}>{children}</AgentSessionProvider>
}
