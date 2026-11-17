/**
 * PROTOTYPE (throwaway, branch `claude/colyseus-group-visits-eval-wpnj8r`):
 * the group room of `src/lib/group-room.ts` rewritten on Colyseus, to measure
 * whether a server-authoritative room is simpler than LiveKit's metadata +
 * participant attributes. Not wired into the app; run
 * `pnpm prototype:colyseus-group` to drive it. Verdict in
 * `docs/prototypes/colyseus-group-tours.md`.
 *
 * What moves into the room compared with LiveKit:
 * - the room state (tour, host, started, host path, quiz ended, members and
 *   their quiz progress/requests) lives here and survives reconnects, so the
 *   client no longer replays attributes from localStorage;
 * - the host is whoever joins with the ticket Next signed (no host-key hash
 *   in metadata, no `RoomServiceClient`);
 * - "End the group tour" is a host message, not a REST DELETE.
 *
 * It runs in its own Node process (Next's standalone `server.js` can't host a
 * WebSocket server): `startGroupServer(port)`.
 */
import {
  CloseCode,
  defineRoom,
  defineServer,
  matchMaker,
  Room,
  validate,
  type Client,
} from '@colyseus/core'
import { MapSchema, schema, t, type SchemaType } from '@colyseus/schema'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { jwtVerify, SignJWT } from 'jose'
import { createSecretKey } from 'node:crypto'
import { z } from 'zod'

const secret = () => createSecretKey(Buffer.from(process.env.GROUP_SECRET ?? 'dev-secret', 'utf8'))

/** What Next signs after checking the host's access to the tour (`POST /api/rooms`). */
export const HostTicket = z.object({
  code: z.string(),
  tourId: z.string(),
  hostName: z.string(),
  groupName: z.string(),
  showResults: z.boolean(),
})
export type HostTicket = z.infer<typeof HostTicket>

export const signHostTicket = (ticket: HostTicket) =>
  new SignJWT(ticket).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('6h').sign(secret())

const verifyHostTicket = async (token: unknown) =>
  typeof token === 'string' ? HostTicket.parse((await jwtVerify(token, secret())).payload) : null

/** The private-tour cookie token (same claims as `signGroupTourToken`). */
const signGroupTourToken = (tourId: string, room: string) =>
  new SignJWT({ tourId, room })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('4h')
    .setSubject('group-tour')
    .sign(secret())

export const Member = schema(
  {
    name: t.string(),
    host: t.boolean(),
    connected: t.boolean(),
    /** JSON list of `GroupRequest` (src/lib/group-requests.ts). */
    requests: t.string(),
    quizAnswered: t.number(),
    quizTotal: t.number(),
    quizDone: t.boolean(),
    quizToken: t.string(),
  },
  'Member',
)
export type Member = SchemaType<typeof Member>

export const GroupState = schema(
  {
    tourId: t.string(),
    hostName: t.string(),
    groupName: t.string(),
    showResults: t.boolean(),
    started: t.boolean(),
    /** Where the host is (`groupLocation`); guests follow it. */
    path: t.string(),
    quizEnded: t.boolean(),
    /** Keyed by device id, so a reload is the same member. */
    members: t.map(Member),
  },
  'GroupState',
)
export type GroupState = SchemaType<typeof GroupState>

/** The close code every device receives when the host ends the group. */
export const GROUP_ENDED = 4001
const RECONNECT_S = 10 * 60

type JoinOptions = { device: string; name: string; ticket?: string }
type GroupClient = Client<{ userData: { device: string } }>

export class GroupRoom extends Room<{ state: GroupState; client: GroupClient }> {
  state = new GroupState()
  maxClients = 200

  async onCreate({ ticket }: { ticket: string }) {
    const host = await verifyHostTicket(ticket)
    if (!host) throw new Error('A group needs a host ticket')
    // The code is the room id. Colyseus does not refuse a duplicate custom id
    // (a second `create` silently shares the first room's seats), so check.
    if ((await matchMaker.query({ roomId: host.code })).length) throw new Error('taken')
    this.roomId = host.code
    this.state.assign({ ...host, members: new MapSchema() })
  }

  async onJoin(client: GroupClient, { device, name, ticket }: JoinOptions) {
    const host = (await verifyHostTicket(ticket).catch(() => null))?.code === this.roomId
    client.userData = { device }
    const member = this.state.members.get(device) ?? new Member()
    member.assign({ name, host, connected: true })
    this.state.members.set(device, member)
    client.send('groupCookie', await signGroupTourToken(this.state.tourId, this.roomId))
  }

  // A dropped phone or reload keeps its seat for 10 minutes.
  async onDrop(client: GroupClient, code?: number) {
    if (code === GROUP_ENDED) return
    this.member(client)?.assign({ connected: false })
    await this.allowReconnection(client, RECONNECT_S)
  }

  onReconnect(client: GroupClient) {
    this.member(client)?.assign({ connected: true })
  }

  // A reload joins again as the same device before its old seat expires:
  // the member stays while any connection of that device is in the room.
  onLeave(client: GroupClient) {
    const device = client.userData!.device
    if (!this.clients.some((other) => other.userData?.device === device))
      this.state.members.delete(device)
  }

  private member(client: GroupClient) {
    return this.state.members.get(client.userData!.device)
  }

  private hostOnly(client: GroupClient, apply: () => void) {
    if (this.member(client)?.host) apply()
  }

  messages = {
    start: (client: GroupClient) => this.hostOnly(client, () => (this.state.started = true)),
    move: validate(z.string().max(500), (client: GroupClient, path) =>
      this.hostOnly(client, () => (this.state.path = path)),
    ),
    endQuiz: (client: GroupClient) => this.hostOnly(client, () => (this.state.quizEnded = true)),
    end: (client: GroupClient) => this.hostOnly(client, () => void this.disconnect(GROUP_ENDED)),
    // Guests publish their own fields only; the schema keeps the rest out.
    me: validate(
      z
        .object({
          requests: z.string().max(4000),
          quizAnswered: z.number().int(),
          quizTotal: z.number().int(),
          quizDone: z.boolean(),
          quizToken: z.string().max(2000),
        })
        .partial(),
      (client: GroupClient, fields) => this.member(client)?.assign(fields),
    ),
  }
}

export const groupServer = defineServer({ rooms: { group: defineRoom(GroupRoom) } })

export function startGroupServer(port: number) {
  groupServer.transport = new WebSocketTransport()
  return groupServer.listen(port)
}

export { CloseCode }
