import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    // PROTOTYPE (throwaway): the Colyseus group server in Next's own process,
    // on an internal port; the `/colyseus` rewrite (next.config.ts) carries
    // its HTTP matchmaking and WebSocket upgrades on Next's port.
    const { startGroupServer } = await import('./lib/group-room.colyseus-prototype')
    await startGroupServer(2567, '127.0.0.1')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
