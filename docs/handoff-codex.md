# Handoff: 18-33 requirement tests and advanced localization UI

Written for the next agent (ChatGPT Codex) taking over from a Claude Code
session. Read `AGENTS.md` first: its rules (Italian with the maintainer,
English in code/commits/docs, intent comments, i18n, responsive layout,
checks) apply unchanged. Current branch: `db-populate`; no PR or merge without asking.
The original handoff below has been superseded by the completed implementation
record in `docs/plan/requisiti-18-33.md`.

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

## Current status (2026-11-07)

Advanced localization is connected to the real GPS/compass hooks, a direction-aware
candidate chooser and distinct next-stop/off-tour notices. Explicit confirmation
updates `at`; estimated movement remains device-local. Family planning/reading,
museum address search/map and personalized read-aloud versions are implemented.
See `docs/tour-navigation.md`, `docs/planned-visits.md` and `docs/museum-location.md`.

The full integration suite has been rerun successfully. The current browser
regression outcome and commands are recorded in the living requirements plan.
Old failures in this handoff are historical, not current findings.

External acceptance still needs evidence unavailable to this executor:

1. Physical iOS/Android permission, heading and indoor-accuracy checks. Synthetic
   sensor tests do not prove real hardware precision. Use HTTPS and check deny,
   grant, background/resume, direction changes, nearby notice withdrawal and
   explicit `at` confirmation; test on a real museum floor plan aligned north.
2. Live OpenFreeMap/Photon acceptance after the maintainer enables the domains:
   `tiles.openfreemap.org`, `assets.openfreemap.com`, `photon.komoot.io`.
   OpenFreeMap Bright/Dark replaces CARTO; run `pnpm test:live:location` with the
   existing fixture or `MUSEUM_LOCATION_LIVE_URL` (English museum with a saved point).
   Three read-only live cases are ready, excluded from ordinary tests, but have
   not been executed. Network settings were not changed in this follow-up; no
   environment publication occurred. See `docs/museum-location.md` for setup.

## Traps

- `pnpm typecheck` rewrites `src/payload-types.ts` unformatted: format it
  with `pnpm exec prettier --write src/payload-types.ts` before committing; preserve
  real schema changes in the generated file.
- Never run `npx prettier --write tests/int/*.ts`: it reformats unrelated
  specs. lint-staged formats staged files at commit.
- Creating `contents` through the Local API in TypeScript needs
  `objects: {}` in `data` (generated type of a read-only join), as `src/seed.ts`.
- Visual tests (`pnpm test:visual`) only with the maintainer's explicit OK.
