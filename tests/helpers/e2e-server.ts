/**
 * Which app the e2e specs drive, read by playwright.config.ts (to start it)
 * and by specs whose checks differ between the two (the Web Vitals budgets).
 * `next dev` while iterating (the one already running is reused, and edits
 * show up without a rebuild); the production build in CI or with
 * `E2E_SERVER=start` after `pnpm build`: no route compiles on first visit
 * inside a test's timeout, production React, closer to what visitors get.
 * `pnpm build` takes ~2 min (cloud session, 4 cores).
 *
 * A function, not a constant: the config loads `.env.local` after its
 * imports are evaluated, and `E2E_SERVER` may come from there.
 */
export const isProductionServer = () => !!process.env.CI || process.env.E2E_SERVER === 'start'
