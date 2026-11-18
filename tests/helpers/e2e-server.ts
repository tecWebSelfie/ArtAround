/**
 * Which app the e2e specs drive, read by playwright.config.ts (to start it)
 * and by specs whose checks differ between the two (the Web Vitals budgets).
 * `next dev` while iterating; the production build in CI or with
 * `E2E_SERVER=start` after `pnpm build`.
 */
export const productionServer = !!process.env.CI || process.env.E2E_SERVER === 'start'
