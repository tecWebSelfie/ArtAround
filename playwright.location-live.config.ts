import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/** Explicit opt-in only: these real-provider checks are excluded from ordinary E2E/Storybook runs. */
export default defineConfig(base, {
  testDir: './tests/live',
  testMatch: 'museum-location.live.spec.ts',
  retries: 0,
  workers: 1,
  timeout: 60_000,
})
