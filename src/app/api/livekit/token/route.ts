import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'

const TTL_GUEST = '5m'
const TTL_USER = '10m'

export const POST = async () => {
  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const agentName = process.env.LIVEKIT_AGENT_NAME || 'my-agent'

  if (!url || !apiKey || !apiSecret) {
    return Response.json(
      { error: 'Voice service not configured (LIVEKIT_URL/KEY/SECRET missing).' },
      { status: 503 },
    )
  }

  // Optional tier: logged-in users get a stable room + longer TTL, guests get a random single-use room.
  let userId: string | null = null
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: await getHeaders() })
    userId = (user as { id?: string | number } | null)?.id?.toString() ?? null
  } catch {
    userId = null
  }

  const suffix = crypto.randomUUID().slice(0, 8)
  const room = userId ? `voice-${userId}` : `voice-guest-${suffix}`
  const identity = userId ? `user-${userId}-${suffix}` : `guest-${suffix}`

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: userId ? TTL_USER : TTL_GUEST,
  })
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })
  const jwt = await token.toJwt()

  // Best-effort explicit agent dispatch so the worker joins even without an auto-dispatch rule.
  // Token is still returned if the agent isn't running (e.g. local dev without `pnpm --dir my-agent dev`).
  try {
    const dispatch = new AgentDispatchClient(url, apiKey, apiSecret)
    await dispatch.createDispatch(room, agentName)
  } catch {
    // Intentionally ignored; client will join and wait for the agent.
  }

  return Response.json({ token: jwt, url, room, identity, guest: !userId })
}
