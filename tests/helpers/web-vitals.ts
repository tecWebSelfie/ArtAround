import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MetricType } from 'web-vitals'
import { productionServer } from './e2e-server'

/**
 * Core Web Vitals measured in a Playwright page by Google's `web-vitals`
 * library, the same code that reports field data (CrUX, Sentry): LCP, CLS
 * and INP (the three Core Web Vitals) plus FCP and TTFB.
 *
 * `collectWebVitals` must run before `page.goto`: it injects the library's
 * IIFE build as an init script, so it observes the page from its first byte.
 * Library and setup go in one script: Playwright wraps each init script in a
 * function, so the IIFE's top-level `var webVitals` is not a global.
 * `readWebVitals` returns the latest value of each metric seen so far
 * (`reportAllChanges`), with the rating and the element the attribution build
 * blames, so a failing budget names the culprit; `expectGoodVitals` checks
 * the budgets below.
 */
export type VitalName = MetricType['name']

export type Vital = {
  value: number
  rating: MetricType['rating']
  /** CSS selector of the element responsible (LCP element, largest shift, interaction). */
  target?: string
}

export type Vitals = Partial<Record<VitalName, Vital>>

const library = readFileSync(
  resolve('node_modules/web-vitals/dist/web-vitals.attribution.iife.js'),
  'utf8',
)

/** Runs in the page, right after the library: `webVitals` is its IIFE's result. */
function observe(api: Record<string, (report: (metric: never) => void, opts?: object) => void>) {
  type Reported = {
    name: string
    value: number
    rating: Vital['rating']
    attribution?: { target?: string; largestShiftTarget?: string; interactionTarget?: string }
  }
  const store: Record<string, Vital> = {}
  ;(window as unknown as { __webVitals: typeof store }).__webVitals = store
  const report = ({ name, value, rating, attribution }: Reported) => {
    store[name] = {
      value,
      rating,
      target:
        attribution?.target ?? attribution?.largestShiftTarget ?? attribution?.interactionTarget,
    }
  }
  // Every update, not only the final value at page hide: a test reads them
  // while the page is still open. INP observes interactions from 16 ms (the
  // minimum) instead of 40, so a quick one in a test still counts.
  for (const name of ['onLCP', 'onCLS', 'onFCP', 'onTTFB'])
    api[name](report, { reportAllChanges: true })
  api.onINP(report, { reportAllChanges: true, durationThreshold: 16 })
}

export async function collectWebVitals(page: Page) {
  await page.addInitScript(`${library}\n;(${observe.toString()})(webVitals)`)
}

export async function readWebVitals(page: Page): Promise<Vitals> {
  return page.evaluate(() => ({ ...(window as unknown as { __webVitals: Vitals }).__webVitals }))
}

/** One line per metric, for the terminal and the report: `LCP 812 ms good (main h1)`. */
export function formatWebVitals(vitals: Vitals) {
  return Object.entries(vitals)
    .map(([name, vital]) => {
      const value = name === 'CLS' ? vital.value.toFixed(3) : `${Math.round(vital.value)} ms`
      return `${name} ${value} ${vital.rating}${vital.target ? ` (${vital.target})` : ''}`
    })
    .join('\n')
}

/**
 * The budgets: the three Core Web Vitals must be rated "good" (LCP ≤ 2.5 s,
 * CLS ≤ 0.1, INP ≤ 200 ms). LCP only on the production server: `next dev`
 * compiles each route on its first visit, so there it is only reported.
 * FCP and TTFB are reported, never budgeted: TTFB of a server-rendered page
 * on a shared CI runner says more about the runner than about the page.
 * CLS and INP may be missing: nothing shifted, or no interaction took 16 ms.
 */
const budgeted: VitalName[] = productionServer ? ['LCP', 'CLS', 'INP'] : ['CLS', 'INP']
const required: VitalName[] = productionServer ? ['LCP'] : []

/** Waits for the page to settle, attaches the values to the report, checks the budgets. */
export async function expectGoodVitals(page: Page) {
  // LCP and CLS settle after load; give late images and fonts a moment.
  await page.waitForLoadState('load')
  await page.waitForTimeout(1_000)
  const vitals = await readWebVitals(page)
  const summary = formatWebVitals(vitals)
  console.log(`${page.url()}\n${summary}`)
  await test.info().attach('web-vitals', { body: summary, contentType: 'text/plain' })
  for (const name of required) expect(vitals[name], `${name} was not reported`).toBeDefined()
  for (const name of budgeted) {
    const vital = vitals[name]
    if (vital) expect(vital.rating, `${name}\n${summary}`).toBe('good')
  }
}
