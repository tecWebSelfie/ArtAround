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

**What LiveKit does today.** Only state sync for groups: group tokens grant
`canPublish: false`, nobody publishes audio or video. The `agents-ui`
components and `/api/token` are leftovers of the voice-agent template: nothing
in the app imports them, and `/api/token` throws outside development. So
Colyseus would replace LiveKit entirely, not sit next to it.

**Shape.** The question is about infrastructure, not a state machine a
non-developer should click through, so the "logic" branch became a runnable
script rather than an HTML page: it drives the room and prints the full state
after each step.

    pnpm prototype:colyseus-group                     # room server in memory
    GROUP_SERVER_URL=http://localhost:3000/colyseus \
      pnpm prototype:colyseus-group                   # the one inside next dev / the standalone

| Prototype file                                                | Replaces                                             |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/group-room.colyseus-prototype.ts` (room + server)    | `src/lib/group-room.ts`, `api/rooms/[code]` (DELETE) |
| `src/app/api/rooms/route.colyseus-prototype.ts` (host ticket) | `api/rooms/route.ts`                                 |
| `src/app/api/rooms/cookie/route.colyseus-prototype.ts`        | the cookie half of `api/rooms/token/route.ts`        |
| `src/components/group/GroupConnection.colyseus-prototype.tsx` | `GroupConnection.tsx`, `GroupRoom.tsx`               |
| `src/instrumentation.ts`, `next.config.ts`, `src/proxy.ts`    | the LiveKit service, its URL and keys                |
| `scripts/prototype-colyseus-group.ts`                         | (driver)                                             |

## Colyseus inside the Next server

Next's standalone `server.js` can't take a custom server, but it doesn't need
to: Next proxies a rewrite to an external URL **including WebSocket
upgrades** (`proxyRequest` in `next/dist/server/lib/router-server.js`). So:

- `instrumentation.ts` `register()` starts the room server in Next's own
  process on `127.0.0.1:2567` (internal, never exposed);
- a rewrite `/colyseus/:path*` → `http://127.0.0.1:2567/:path*` carries the
  HTTP matchmaking and the WebSocket on Next's port; `src/proxy.ts` skips
  `/colyseus` (otherwise the i18n redirect sends it to `/en/colyseus`);
- `@colyseus/core` and `@colyseus/ws-transport` go in
  `serverExternalPackages` (they use dynamic `require`).

The browser connects to `${location.origin}/colyseus` in every environment:
no URL, port, process or service to configure. Verified with every scenario
below on `next dev`, on the standalone build (`node server.js`), and on a
copy of `.next/standalone` outside the repository (so nothing came from the
repo's `node_modules`). One trap found: the transport must be passed to
`defineServer({ transport })`; assigned afterwards, Colyseus' async init
replaces it with a default one imported dynamically, which in the standalone
loads a second `@colyseus/core` and the WebSocket never finds the room.

Scenarios: host opens a named room; same name refused; guest joins by code and
gets the private-tour token; start/move reach guests; a guest can't move the
group; guest request and quiz progress in the room state; late joiner lands on
the host's path; host network drop (SDK reconnects by itself, seat kept,
guests see "not connected"); guest page reload (same device, progress kept
server-side); host ends the group (close code to everyone); joining an ended
group fails.

## Measurements

Code lines exclude blanks and comments. Cognitive complexity was measured with
the project's oxlint config at threshold 0 to get every function's score.

| Metric                                      | LiveKit (today)                                                                                 | Colyseus prototype              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| Lines, the replaced files                   | 450                                                                                             | 283 (+7 wiring)                 |
| Lines, estimated when complete              | 450                                                                                             | ~305                            |
| Functions scored                            | 24                                                                                              | 15                              |
| Cognitive complexity, sum / max             | 61 / 8                                                                                          | 26 / 5                          |
| oxlint warnings at the project's limit (15) | 0                                                                                               | 0                               |
| Client library, minified / gzip             | 582 KB / 153 KB                                                                                 | 178 KB / 57 KB                  |
| Server-side packages in the standalone      | `livekit-server-sdk`                                                                            | ~1.2 MB of `@colyseus/*`        |
| What each environment must provide          | LiveKit server (Docker locally, LiveKit Cloud in production) + `LIVEKIT_URL/API_KEY/API_SECRET` | nothing beyond the app's secret |

Still missing from the prototype (~15 lines): telling a transient connection
failure from an ended room (the prototype treats every join error as "ended",
which the LiveKit version deliberately avoids). The ~770 lines of group UI that
read LiveKit hooks (`GroupMembers`, `GroupBadgePanel`, `GroupRequests`,
`GroupQuizBoard`, `GroupRoomPage`, `GroupProvider`) would swap hooks one for
one (`useParticipants` → `useRoomState(s => s.members)`) and shrink slightly:
no `GroupRoom` wrapper, no attribute replay in `GroupProvider`.

## Findings per criterion

- **Lines of code: Colyseus, about a third fewer** (~305 vs 450) in the
  connection layer: no retry loop, token endpoint, REST check/delete route,
  `SettingsWatcher`/`HostWatcher`, or attribute replay from localStorage.
  Outside the app code it also removes the LiveKit Docker service and the
  `tests/helpers/livekit.ts` check.
- **Abstraction: Colyseus, with a caveat.** The client gets more from the API
  (`useRoom` + `useRoomState`, automatic reconnection with seat reservation,
  validated messages); the group rules move into a small server room class
  (who is host, who may move the group, member lifecycle) instead of being
  spread over client effects. API gaps found: a custom `roomId` is **not
  unique** (a second `create` with the same id silently joined the first
  room; the prototype queries the matchmaker to refuse it), and automatic
  reconnection only starts once a room has been up 5 s.
- **Extensibility: Colyseus for what groups do today.** Shared, validated
  group state is its core: polls or votes at a stop, raise hand, host
  hand-off, timers, per-member fields with server checks. LiveKit would only
  pull ahead if the guide's voice or an AI guide in the room became features:
  that needs media, which Colyseus doesn't have (it could be added later with
  LiveKit for audio only).
- **Readability: Colyseus.** Cognitive complexity sum 61 → 26, highest
  function 8 → 5; neither has a warning at the project's limit of 15.
- **Portability: Colyseus.** Same code and configuration in dev, the cloud
  preview and the standalone deploy: one process, one port, same origin. The
  LiveKit setup differs per environment today (Docker container with
  `--node-ip`, `ws://` locally vs LiveKit Cloud `wss://` keys in production,
  a third-party service to keep alive). Costs of the in-process server: rooms
  live in Next's memory, so a deploy or restart ends every open group (LiveKit
  Cloud rooms survive an app restart), and it runs on one instance only (more
  would need Colyseus' Redis presence), which matches the single container.

## Verdict

**Worth switching**, if open groups ending on a server restart is acceptable
(a restart is a deploy; the host's device still holds a valid ticket, so it
could reopen the room with the same code and the guests reconnect, which the
prototype doesn't do yet). Colyseus removes LiveKit and its per-environment
setup entirely, the connection code drops by about a third with half the
cognitive complexity, and the group rules become one server room class.

Before folding it in: handle transient join failures, reuse an existing
secret (e.g. `PAYLOAD_SECRET`) for the host ticket and the private-tour token
instead of `LIVEKIT_API_SECRET`, remove the unused `agents-ui` template, and
port the e2e group specs (they are the real acceptance test).
