# Handoff: 18-33 requirement tests and advanced localization UI

Written for the next agent (ChatGPT Codex) taking over from a Claude Code
session. Read `AGENTS.md` first: its rules (Italian with the maintainer,
English in code/commits/docs, intent comments, i18n, responsive layout,
checks) apply unchanged. Branch: `ccr-05ce6c3f-yjnqrl` (push here only; no
PR or merge without asking).

## Goal

Tests proving the course brief's navigator requirements for level 18-33
(PDF "Progetto 2025/26", pages 18-33), **marketplace excluded**, are
satisfied by ArtAround. Method: test-first at agreed public seams (red →
green), no tests against internals, mock only system boundaries (AI models,
fetch to the app itself).

Requirement ↔ test map and status: `docs/plan/requisiti-18-33.md` (Italian,
the living checklist; update it as you go).

## Done (commits `74b0ae0`, `0521a52`, pushed)

New integration specs in `tests/int/`, all green:

| Spec                                     | Requirement (PDF)                                             |
| ---------------------------------------- | ------------------------------------------------------------- |
| `assistant-natural-language.int.spec.ts` | Free-speech voice commands mapped onto available commands     |
| `group-guest-commands.int.spec.ts`       | 18-27: a student asks for more/other level, never next/back   |
| `content-translation.int.spec.ts`        | Contents in the visitor's language (`resolveLocalized`)       |
| `tour-plan.int.spec.ts`                  | Tours from user constraints (time, family, returning, thesis) |
| `printed-qr.int.spec.ts`                 | Printed QR → object page, visitor language, museum mode       |
| `item-metadata.int.spec.ts`              | Item length, language level, author, licence                  |
| `teleport.int.spec.ts`                   | Teleport to a preset point next to each work                  |
| `work-in-front.int.spec.ts`              | Advanced localization rule (position + compass → work)        |

Code changes: `guestCommands()` moved into `src/lib/group.ts` (used by
`navigation-commands.ts`); new pure rule `src/lib/work-in-front.ts`;
`vitest.int.config.mts` inlines `next-i18next` so `src/proxy.ts` loads.
`content-translation` and `item-metadata` need MongoDB
(`pnpm services:start`) and delete what they create.

Run them: `pnpm test:int tests/int/<name>.int.spec.ts`.

## Remaining work

1. **Advanced localization UI** (only open requirement). The rule exists;
   nothing calls it yet. Wire:
   - compass heading from `DeviceOrientationEvent` (`webkitCompassHeading`
     on iOS, which needs `DeviceOrientationEvent.requestPermission()` from a
     user tap; `alpha` from `deviceorientationabsolute` elsewhere) in a hook
     next to `museum/[id]/navigation/gps-source.ts` (simulator: let the D-pad
     also turn the heading when `NEXT_PUBLIC_GPS_SIMULATOR=true`);
   - the GPS plan estimate already computed in `use-route-guidance.ts`
     (`estimatePlanPoint`) plus placed works' plan points (the map's object
     positions, see `museumRooms(nodes).objects` in `src/lib/museum-rooms.ts`)
     → `workInFront(...)`;
   - `sure` → offer/open that work (same as "What is this?":
     `${here}/object/${id}`); `choose` → a small chooser with each
     candidate's low-resolution image (object thumbnail) and name; picking
     one sets `at` like `NavigationObjectActions` (`withNavigationValue`).
   - It is a new UI surface: per AGENTS.md run `/impeccable shape` first, add
     a Storybook story, translate new keys in `en`/`it` (then all languages
     before a PR), `npx i18next-cli extract`. Add an e2e or story test.
2. Before pushing: `/simplify` on the unpushed diff (not run on the commits
   above), `pnpm typecheck` (also the pre-push hook), focused `pnpm test:int`.
3. Optional, not done: full `pnpm test:int` run; e2e suite.

## Traps

- `pnpm typecheck` rewrites `src/payload-types.ts` unformatted: restore it
  with `git checkout src/payload-types.ts` (or prettier) before committing.
- Never run `npx prettier --write tests/int/*.ts`: it reformats unrelated
  specs. lint-staged formats staged files at commit.
- Creating `contents` through the Local API in TypeScript needs
  `objects: {}` in `data` (generated type of a read-only join), as `src/seed.ts`.
- Visual tests (`pnpm test:visual`) only with the maintainer's explicit OK.
