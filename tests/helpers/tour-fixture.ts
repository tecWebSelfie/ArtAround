import { test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The seeded tour-navigation fixture shared by the e2e specs that need a real
 * museum map (tour navigation, QR, guidance, voice, expansion, group tours).
 *
 * `pnpm seed:e2e` (base seed, then scripts/seed-tour-navigation.ts) creates it
 * idempotently and writes `.e2e-fixtures/tour-navigation-fixture.json`; every
 * spec reads that one file, so no environment variable has to be copied from
 * the seed's output. `TOUR_NAVIGATION_URL` still overrides the start URL (e.g.
 * another host or tour).
 */
export type TourFixture = {
  museumId: string
  tourId: string
  /** Object 1 is in the West hall; Objects 2 and 3 are in the East hall. */
  objectIds: string[]
  /** The tour's first step: `…/museum/[id]/navigation/tour/[tourId]/0`. */
  url: string
}

const fixturePath = resolve('.e2e-fixtures/tour-navigation-fixture.json')

const fromFile = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, 'utf8')) as TourFixture)
  : null

export const tourFixture: TourFixture | null = fromFile && {
  ...fromFile,
  url: process.env.TOUR_NAVIGATION_URL ?? fromFile.url,
}

const MISSING = 'No tour fixture: run `pnpm seed:e2e` first.'

/**
 * Call in `test.beforeEach`. Locally a missing seed skips the spec with the
 * command to run. In CI it fails instead: a suite that skips everything it
 * can't set up would report green while testing nothing.
 */
export function requireTourFixture(): TourFixture {
  if (tourFixture) return tourFixture
  if (process.env.CI) throw new Error(MISSING)
  test.skip(true, MISSING)
  // Unreachable: `test.skip(true)` stops the test.
  throw new Error(MISSING)
}
