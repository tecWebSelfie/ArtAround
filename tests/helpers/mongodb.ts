import { connect } from 'node:net'

/**
 * Specs that boot Payload (Local API) need the development MongoDB, the
 * `mongodb` service that `pnpm services:start` runs in Docker. Payload itself
 * uses a real MongoDB in its own tests too (payloadcms/payload#14982 dropped
 * mongodb-memory-server), so there is no in-memory stand-in here.
 *
 * Without the server `getPayload()` only gives up after its own connection
 * timeout, and the spec reads "Hook timed out in 10000ms" ~25 s later.
 * `requireMongoDB()` tries a plain TCP connection to DATABASE_URL's host
 * first and fails at once with the command to run.
 */
export async function requireMongoDB(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set: copy .env.example to .env.')
  const { protocol, hostname, port } = new URL(url)
  // An SRV address (`mongodb+srv://`, Atlas) has no single host to probe:
  // leave it to the driver.
  if (protocol !== 'mongodb:') return

  const reachable = await new Promise<boolean>((resolve) => {
    const socket = connect({ host: hostname, port: Number(port || 27017) })
    // Only the handshake matters: close the probe either way.
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(2_000)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
  if (!reachable) {
    throw new Error(
      `MongoDB is not reachable at ${hostname}:${port || 27017}: run \`pnpm services:start\`.`,
    )
  }
}
