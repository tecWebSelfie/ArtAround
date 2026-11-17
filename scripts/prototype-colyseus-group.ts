/**
 * PROTOTYPE driver (throwaway): starts the Colyseus group room of
 * `src/lib/group-room.colyseus-prototype.ts` in memory and walks it through
 * the group-tour cases that LiveKit handles today, printing the room state
 * after each step. `pnpm prototype:colyseus-group`.
 */
import { Client, type Room } from '@colyseus/sdk'
import {
  GROUP_ENDED,
  groupServer,
  signHostTicket,
  startGroupServer,
  type GroupState,
} from '../src/lib/group-room.colyseus-prototype'

const PORT = 2567
// GROUP_SERVER_URL=http://localhost:3000/colyseus drives the server that
// `next dev` / the standalone runs in-process (instrumentation.ts) instead.
const URL_ = process.env.GROUP_SERVER_URL ?? `ws://localhost:${PORT}`
const sdk = new Client(URL_)
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

function show(step: string, room: Room<GroupState>) {
  const { members, ...group } = room.state.toJSON() as Record<string, unknown> & {
    members: Record<string, unknown>
  }
  console.log(`\n── ${step}`)
  console.log('   group  ', JSON.stringify(group))
  for (const [device, member] of Object.entries(members))
    console.log('   member ', device, JSON.stringify(member))
}

if (!process.env.GROUP_SERVER_URL) await startGroupServer(PORT)
const ticket = await signHostTicket({
  code: 'FENICEROSSA',
  tourId: '42',
  hostName: 'Ada',
  groupName: 'Fenice rossa',
  showResults: true,
})

// 1. The host opens the room with the ticket Next signed after the access checks.
const host = await sdk.create<GroupState>('group', { ticket, device: 'host-phone', name: 'Ada' })
host.onMessage('groupCookie', () => {})
await wait()
show('host opened FENICEROSSA', host)

// 2. Another host picks the same name: refused by Colyseus itself (room id taken).
await sdk
  .create('group', { ticket, device: 'other', name: 'Bob' })
  .then(() => console.log('\n── second room with the same name: ACCEPTED (unexpected)'))
  .catch((error: Error) =>
    console.log('\n── second room with the same name refused:', error.message),
  )

// 3. A guest joins by code and receives the private-tour cookie token.
const guest = await sdk.joinById<GroupState>('FENICEROSSA', { device: 'g1', name: 'Carla' })
guest.onMessage('groupCookie', (token: string) =>
  console.log('\n── Carla got the group cookie token', token.slice(0, 16) + '…'),
)
await wait()
show('Carla joined', guest)

// 4. Start, move: state reaches the guest.
host.send('start')
host.send('move', '/museum/5/navigation/tour/42/3/content/7?at=9')
await wait()
show('host started and moved (as Carla sees it)', guest)

// 5. A guest may not move the group.
guest.send('move', '/somewhere/else')
guest.send('me', { requests: '[{"kind":"more","stop":3,"at":1}]', quizAnswered: 1, quizTotal: 2 })
await wait()
show('Carla tried to move the group, then published her request and quiz progress', host)

// 6. Late joiner lands where the group is: the state is the source, no replay.
const late = await sdk.joinById<GroupState>('FENICEROSSA', { device: 'g2', name: 'Dario' })
late.onMessage('groupCookie', () => {})
await wait()
console.log('\n── Dario (late) sees path', late.state.path, 'started', late.state.started)

// 7. The host's phone drops: seat kept, guests see "host not connected".
// A network drop: the SDK reconnects on its own with its reconnection token
// (only once the room has been up 5 s, its default minimum uptime).
await wait(5000)
void host.leave(false)
await wait(100)
show('host connection dropped', guest)
await wait(3000)
show('host reconnected by the SDK, same seat', guest)
const back = host

// 7b. Carla reloads the page: a new connection, same device, while her old
// seat is still held. Her request and quiz progress are still in the room.
guest.connection.close()
const reloaded = await new Client(URL_).joinById<GroupState>('FENICEROSSA', {
  device: 'g1',
  name: 'Carla',
})
reloaded.onMessage('groupCookie', () => {})
await wait()
show('Carla reloaded the page', reloaded)

// 8. Quiz ended, then the host ends the group for everyone.
back.send('endQuiz')
reloaded.onLeave((code) =>
  console.log('\n── Carla left with code', code, code === GROUP_ENDED ? '(group ended)' : ''),
)
await wait()
back.send('end')
await wait(300)
await sdk
  .joinById('FENICEROSSA', { device: 'g3', name: 'Eva' })
  .catch((error: Error) => console.log('── joining the ended group:', error.message))
if (!process.env.GROUP_SERVER_URL) await groupServer.gracefullyShutdown(false)
process.exit(0)
