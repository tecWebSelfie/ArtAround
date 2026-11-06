/**
 * Group-tour e2e specs run against a real LiveKit server (`pnpm db:start`
 * starts the local one, `livekit-server --dev` on :7880), as LiveKit's own
 * docs recommend for local testing: there is no client-side mock to swap in.
 *
 * Without the server a group never opens and every step waits out its
 * 60 s expect timeout, so a missing server cost minutes and read like an app
 * bug. `requireLiveKit()` checks once, up front, and fails at once with the
 * command to run. It fails rather than skips (unlike `requireTourFixture`):
 * group tours are what these tests exist to check, so a run without the
 * server is not one to report as green.
 */
const url = (process.env.LIVEKIT_URL ?? 'ws://localhost:7880').replace(/^ws/, 'http')

let reachable: Promise<boolean> | undefined

export async function requireLiveKit(): Promise<void> {
  // The signal server answers plain HTTP on its root (the compose healthcheck uses it too).
  reachable ??= fetch(url, { signal: AbortSignal.timeout(3_000) }).then(
    () => true,
    () => false,
  )
  if (!(await reachable)) {
    throw new Error(
      `LiveKit is not reachable at ${url}: run \`pnpm db:start\` (it starts LiveKit too).`,
    )
  }
}
