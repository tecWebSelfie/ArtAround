# Group tours: design and implementation status

Last reviewed: 2026-10-20. A tour can be visited alone or as a group (a class,
friends, a guided visit). Related: [tour navigation](tour-navigation.md),
[tour quiz](tour-quiz.md).

## Agreed behavior

- **Start:** the tour's start page (`/[lng]/tour/{id}/navigation`) offers "Start Tour"
  (alone) and "Start with a group". The group's creator is its **host** and gives a
  name shown to the group.
- **Join:** a 6-character code (no 0/O/1/I), typed on the navigator home or the tour's
  start page, a shared link, or a QR code (the in-tour scanner accepts room links).
  All open `/[lng]/room/{code}`, which asks for a name (remembered on the device only).
- **Waiting room:** the code in large type, "Share link" (system share sheet, copy as
  fallback), "Show QR code" (both language-free, `/room/CODE`: each guest joins, and
  then follows the host, in their own language), and the live list of who has arrived. The host presses
  "Start the tour" whenever ready; people can still join afterwards and land where the
  group is.
- **During the tour, guests follow the host.** Shared: the step, position (`at`),
  destination (`to`/`service`/`exit`) and the open modal. Personal: language,
  wheelchair route, reading options (`level`, `minutes`, `audience`), "Tell me more"
  (`more`), GPS estimate. Guests have no step selection, destinations, "go to"
  commands, scanner or position buttons; their voice/search commands are limited to
  reading and wheelchair routing.
- **Modals:** the host opening a modal opens it for everyone; it closes for guests
  when the host closes it (no close button, Escape or outside click for guests). Guests
  see "{host} will continue when ready" and can always "Leave the group".
- **Group panel:** a pill with the head count beside the tour title opens who is here;
  the host can invite and "End the group tour" (closes it for everyone), guests can leave.
- **Quiz:** the host leads everyone into it. Guests take the normal quiz; the host
  instead sees each guest's progress, ends the quiz when ready (unfinished guests hand
  in what they answered). **Scores are optional:** "See everyone's quiz results" in
  "Start with a group" (off by default). When on, the join page tells guests and the
  host sees each score with a link to the answers; when off, guests never share their
  result and the board only says who has finished.
- **Host drops out:** guests stay where they are and see that the host is not
  connected; reopening the app on the host's device makes it host again.

## How it works

One LiveKit room per group; the code is the room name. Nothing about rooms is stored
in Payload.

| Piece        | Where                                                                                               | Notes                                                                                                                                                                                                                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared rules | `src/lib/group.ts`                                                                                  | Code format, name schema (zod, shared by forms and API), `groupLocation` (what the host shares), `followHref` (where a guest goes). Unit-tested in `tests/int/group.int.spec.ts`.                                                                                                                                                      |
| Server       | `src/lib/group-room.ts`                                                                             | `RoomServiceClient`: create (metadata: tour, host name, SHA-256 of the host key), find, delete; `AccessToken` per participant.                                                                                                                                                                                                         |
| API          | `src/app/api/rooms/`                                                                                | `POST /api/rooms` opens a room → `{ code, hostKey }`; `POST /api/rooms/token` is LiveKit's standard token endpoint (`TokenSource.endpoint`) with `X-Host-Key` / `X-Guest-Id` headers; `GET`/`DELETE /api/rooms/{code}` check and end.                                                                                                  |
| Connection   | `src/components/group/GroupProvider.tsx`                                                            | Mounted once in the frontend layout; membership in localStorage (`aa-group`); provides LiveKit's `RoomContext`, so components use `@livekit/components-react` hooks (`useParticipants`, `useRemoteParticipant`, `useParticipantAttributes`, `useConnectionState`, `useRoomInfo`). `GroupSync` publishes / follows the host's location. |
| UI           | `src/components/group/`                                                                             | `JoinGroupForm`, `StartGroupButton`, `GroupNameForm` (`@mantine/form` + the zod schema), `GroupMembers`, `ShareGroup` (QR via `@gfazioli/mantine-qr-code`), `GroupBadge`, `use-group-exit` (`@mantine/modals` confirms).                                                                                                               |
| Pages        | `room/[code]/`                                                                                      | Join form, waiting room, "group has ended".                                                                                                                                                                                                                                                                                            |
| Guest limits | `NavigationModal`, `navigation-commands.ts`, `TourProgress`, `StepModal`, `NavigationObjectActions` | Each reads `useIsGroupGuest()`.                                                                                                                                                                                                                                                                                                        |
| Quiz         | `tour/[id]/quiz/group-quiz.ts`, `GroupQuizBoard.tsx`                                                | Guest progress and result token as attributes; host board; `groupQuizScores` Server Function reads scores by token.                                                                                                                                                                                                                    |

Live state is LiveKit **participant attributes**, delivered to late joiners too:

- host: `path` (the shared location, e.g. `/tour/42/navigation/3/content/7?at=9`),
  `quiz` (`ended`);
- guest: `quizAnswered`, `quizTotal`, then `quizToken` (results shared) or `quizDone`.

Room metadata (set by the server, readable by everyone in the room through
`useRoomInfo`): tour id, host name, `showResults`, and a SHA-256 of the host key.

Attributes belong to a connection, so the ones that must survive a reload (`quiz`,
quiz progress and result) go through `publish` (GroupProvider): it keeps them in the
stored membership, and GroupSync sends them again on every connect.

Guests trust only the participant whose identity is `host`, which only a token minted
with the right host key gets. Tokens grant data/attribute updates only, never audio
or video publishing.

## Running it

- Local: `docker compose -f my-agent/compose.livekit.yaml up -d livekit` (dev keys
  `devkey`/`secret`, `LIVEKIT_URL=ws://localhost:7880`). The server is started with
  `--node-ip 127.0.0.1`; without it rooms stay "connecting" because the browser can't
  reach the container's IP.
- Production: a LiveKit Cloud project; set `LIVEKIT_URL` (`wss://…`), `LIVEKIT_API_KEY`
  and `LIVEKIT_API_SECRET`. An HTTPS site can't open `ws://`.

## Verification status

Last reviewed 2026-10-20.

- **Unit** (`tests/int/`): `group.int.spec.ts` (code format, shared and personal URL
  params) and `rooms-api.int.spec.ts` (host token only with the host key, guest token
  otherwise, ended/invalid rooms, only the host key ends a room; LiveKit faked).
- **Storybook** (`Group/*` and DirectionsBar `TourCompletedWithQuiz`): member list,
  join form (code typed in lower case opens `/en/room/AB3X9K`), name form (trim,
  empty-name error), "Start with a group" (sends the results choice, server error).
  Components that need a live room (`GroupBadge`, the waiting room, the board) are
  covered by the e2e tests instead.
- **E2E** (`tests/e2e/group-tour.e2e.spec.ts`, two or three browsers on the seeded
  fixture; the seed adds a 2-question quiz; needs the local LiveKit server and
  `PLAYWRIGHT_USE_RUNNING_SERVER=true`):
  1. results on: create, join by code from the navigator, notice on the join page,
     live member list, start, follow, locked guest modal (no close, Escape ignored),
     free reading, host closes, group quiz, end quiz, scores, end the group;
  2. results off with a late Italian guest: lands straight in the open modal in
     Italian, keeps `mobility=wheelchair` while following, host reload (guests stay,
     then follow again), private board ("Finished", no score), guest reload keeps
     "Finished", host reload keeps the quiz ended, end from the board;
  3. leaving mid-tour (the guest gets solo controls back), joining a second group while
     in one (warning), leaving from the waiting room, ending from the waiting room and
     from the map panel, ended and mistyped codes;
  4. the quiz alone (no group) through to its result page.
- **Manual only:** the scanner opening a room link (needs a camera); LiveKit Cloud
  (`wss://`) from the uni HTTPS deployment, which needs the project's keys.
- Fixed while testing: the tour start page crashed (`StartTourButton` passed a function
  to a client component); quiz pages 404'd for visitors (questions are not readable by
  them, so `quiz.server.ts` reads with `overrideAccess`); submitting a quiz could
  bounce back to question 1 (the URL clamp ran after the saved answers were cleared).
