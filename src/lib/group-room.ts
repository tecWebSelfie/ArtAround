import 'server-only'

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { HOST_IDENTITY, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './group'

/**
 * Server side of group tours (see `src/lib/group.ts` for the overview).
 * LiveKit is the only store: a room's metadata holds the tour and a hash of
 * the host key, so no database table is needed and rooms disappear on their
 * own once everyone has left.
 */

/** `showResults`: the host chose to see each guest's quiz score ("Start with a group"). */
type RoomMetadata = { tourId: string; hostKeyHash: string; hostName: string; showResults: boolean }

/** Rooms survive a host's dropped phone or reload for this long after it empties. */
const DEPARTURE_TIMEOUT_S = 10 * 60
/** A room nobody joined yet (the host is on the waiting page) waits this long. */
const EMPTY_TIMEOUT_S = 30 * 60

function livekitConfig() {
  const url = process.env.LIVEKIT_URL
  const key = process.env.LIVEKIT_API_KEY
  const secret = process.env.LIVEKIT_API_SECRET
  if (!url || !key || !secret) throw new Error('LiveKit is not configured')
  return { url, key, secret }
}

function rooms() {
  const { url, key, secret } = livekitConfig()
  // The room API speaks HTTP on the same host as the WebSocket URL.
  return new RoomServiceClient(url.replace(/^ws/, 'http'), key, secret)
}

const sha256 = (value: string) => createHash('sha256').update(value).digest()

function newRoomCode() {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++)
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  return code
}

/** Opens a room for a tour. The host key is returned once and never stored in clear. */
export async function createGroupRoom(tourId: string, hostName: string, showResults: boolean) {
  const service = rooms()
  // 32^6 ≈ 1 billion codes: a clash is very unlikely, but check anyway.
  let code = newRoomCode()
  while ((await service.listRooms([code])).length) code = newRoomCode()
  const hostKey = randomBytes(24).toString('base64url')
  const metadata: RoomMetadata = {
    tourId,
    hostKeyHash: sha256(hostKey).toString('hex'),
    hostName,
    showResults,
  }
  await service.createRoom({
    name: code,
    metadata: JSON.stringify(metadata),
    emptyTimeout: EMPTY_TIMEOUT_S,
    departureTimeout: DEPARTURE_TIMEOUT_S,
  })
  return { code, hostKey }
}

/** The open room for a code, or null when it never existed or has ended. */
export async function findGroupRoom(code: string) {
  const [room] = await rooms().listRooms([code])
  if (!room) return null
  try {
    return JSON.parse(room.metadata) as RoomMetadata
  } catch {
    return null
  }
}

export function isHostKey(room: RoomMetadata, hostKey: string | undefined) {
  if (!hostKey) return false
  return timingSafeEqual(sha256(hostKey), Buffer.from(room.hostKeyHash, 'hex'))
}

/**
 * A token for one room. Everyone may update their own attributes (host:
 * where the group is; guests: quiz progress), nobody publishes audio or video.
 * Followers only trust attributes of the participant named `HOST_IDENTITY`,
 * which only a valid host key can obtain.
 */
export async function groupToken(code: string, who: { identity: string; name: string }) {
  const { url, key, secret } = livekitConfig()
  const token = new AccessToken(key, secret, { identity: who.identity, name: who.name, ttl: '6h' })
  token.addGrant({
    room: code,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false,
    canUpdateOwnMetadata: true,
  })
  return { serverUrl: url, token: await token.toJwt(), isHost: who.identity === HOST_IDENTITY }
}

/** Ends the group for everyone: LiveKit disconnects all devices. */
export async function endGroupRoom(code: string) {
  await rooms().deleteRoom(code)
}
