# Prototype: Colyseus for group tours (verdict)

Date: 2026-11-17. Branch: `claude/colyseus-group-visits-eval-wpnj8r` (throwaway,
not for main). Built with the `prototype` skill (Matt Pocock's
`mattpocock/skills`, MIT, copied into `.agents/skills/prototype`).

**Question.** Would [Colyseus](https://github.com/colyseus/colyseus) 0.18
(server-authoritative rooms with synchronized state) be a better base for
[group tours](../group-tours.md) than LiveKit rooms (metadata + participant
attributes)? Criteria: lines of code, abstraction (API over own logic),
extensibility, readability (oxlint `sonarjs/cognitive-complexity`),
portability (per-environment configuration).

**Shape.** The question is about infrastructure, not a state machine a
non-developer should click through, so the "logic" branch became a runnable
script rather than an HTML page: it starts the room in memory and prints the
full state after each step.

    pnpm prototype:colyseus-group

| Prototype file                                                | Replaces                                             |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/group-room.colyseus-prototype.ts` (room + server)    | `src/lib/group-room.ts`, `api/rooms/[code]` (DELETE) |
| `src/app/api/rooms/route.colyseus-prototype.ts` (host ticket) | `api/rooms/route.ts`                                 |
| `src/app/api/rooms/cookie/route.colyseus-prototype.ts`        | the cookie half of `api/rooms/token/route.ts`        |
| `src/components/group/GroupConnection.colyseus-prototype.tsx` | `GroupConnection.tsx`, `GroupRoom.tsx`               |
| `scripts/prototype-colyseus-group.ts`                         | (driver)                                             |

Scenarios run and passing: host opens a named room; same name refused; guest
joins by code and gets the private-tour token; start/move reach guests; a
guest can't move the group; guest request and quiz progress in the room
state; late joiner lands on the host's path; host network drop (SDK
reconnects by itself, seat kept, guests see "not connected"); guest page
reload (same device, progress kept server-side); host ends the group (close
code to everyone); joining an ended group fails.

## Measurements

Code lines exclude blanks and comments. Cognitive complexity was measured with
the project's oxlint config at threshold 0 to get every function's score.

| Metric                                      | LiveKit (today) | Colyseus prototype                   |
| ------------------------------------------- | --------------- | ------------------------------------ |
| Lines, the replaced files                   | 450             | 283                                  |
| Lines, estimated with what is still missing | 450             | ~330 (see below)                     |
| Functions scored                            | 24              | 15                                   |
| Cognitive complexity, sum / max             | 61 / 8          | 26 / 5                               |
| oxlint warnings at the project's limit (15) | 0               | 0                                    |
| Client library, minified / gzip             | 582 KB / 153 KB | 178 KB / 57 KB                       |
| Server processes to run                     | LiveKit server  | LiveKit (voice agent) **+** Colyseus |

Still missing from the prototype (estimated ~45 lines): telling a transient
connection failure from an ended room (the prototype treats every join error
as "ended", which the LiveKit version deliberately avoids), and the deploy
wiring (an esbuild entry for the room server, the boot script starting it,
`services:start` / dev script). The ~770 lines of group UI that read LiveKit
hooks (`GroupMembers`, `GroupBadgePanel`, `GroupRequests`, `GroupQuizBoard`,
`GroupRoomPage`, `GroupProvider`) would swap hooks one for one
(`useParticipants` → `useRoomState(s => s.members)`) and shrink slightly: no
`GroupRoom` wrapper, no attribute replay in `GroupProvider`.

## Findings per criterion

- **Lines of code: Colyseus wins, ~25% fewer** (~330 vs 450) in the
  connection layer. The savings are the retry loop, the token endpoint, the
  REST check/delete route, `SettingsWatcher`/`HostWatcher`, and replaying
  attributes from localStorage after every reconnect.
- **Abstraction: mixed.** Colyseus gives more for free on the client
  (`useRoom` + `useRoomState`, automatic reconnection with seat reservation,
  validated messages), but the group rules move into our own server code
  (`GroupRoom`: who is host, who may move the group, member lifecycle). With
  LiveKit there is no server logic for state at all, the rules live in the
  client. Two gaps found in Colyseus' API: a custom `roomId` is **not unique**
  (a second `create` with the same id silently joined the first room; the
  prototype queries the matchmaker to refuse it), and automatic reconnection
  only starts once a room has been up 5 s.
- **Extensibility: depends on the direction.** Colyseus is better for shared,
  authoritative group state: polls or votes at a stop, raise hand, host
  hand-off, timers, validated per-member fields. LiveKit is better for what a
  guided museum visit is likely to want next: the guide's **voice** to the
  group's headphones, an AI guide agent joining the room (LiveKit Agents is
  already used for the voice assistant), recordings. Colyseus has no media.
- **Readability: Colyseus wins.** Cognitive complexity sum 61 → 26, highest
  function 8 → 5; neither has a warning at the project's limit of 15.
- **Portability: Colyseus loses, and this decides it.**
  - LiveKit stays anyway (`agents-ui`, `/api/token`), so Colyseus adds a
    second realtime server and its URL/secret instead of replacing one.
  - Next's standalone `server.js` can't host the WebSocket server (Next's
    custom-server guide: standalone and a custom server "cannot be used
    together"), so production needs a second Node process started by
    `standalone-boot.mjs` on another port, and the browser must reach it over
    `wss://` on that port or through a proxy path. The deploy container can't
    be entered and its network setup isn't ours to change, so this is
    unverified and may be impossible there; the alternative is Colyseus Cloud
    (another paid service). Dev also needs a second process next to
    `next dev`.
  - Today the differences between environments are the three `LIVEKIT_*`
    variables (dev keys + local container vs LiveKit Cloud). With Colyseus:
    `NEXT_PUBLIC_GROUP_SERVER_URL` (inlined at build time), a shared secret, a
    port, and the extra process, on top of the LiveKit variables.

## Verdict

**Not worth switching.** Colyseus makes the group connection code about a
quarter smaller and simpler to read, but the app keeps LiveKit for the voice
assistant, so it adds a second realtime stack, and it needs a second
WebSocket process the standalone deploy can't host as is. LiveKit also keeps
the media path open (the guide's voice, an AI guide in the room), which is
the most likely next feature for guided visits.

Worth folding into the LiveKit version instead (separately, if wanted): the
readability gains came from moving state out of the reconnect logic. Part of
that is reachable with LiveKit too, e.g. keeping the room settings and
`started` in room metadata set by the server, so fewer attributes need the
localStorage replay.

Reopen the question if: the voice assistant leaves LiveKit, the deploy gets a
second exposed port or a proxy path for WebSockets, or group features turn
towards shared, validated state (polls, voting, games) more than media.
