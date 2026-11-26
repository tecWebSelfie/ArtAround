import { readFileSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-26, group tours (a/e): the host's quiz board reads every
 * guest's score with ONE `groupQuizScores` call over all the `quizToken`
 * attributes it can see (GroupQuizBoard `useScores`). The action validates the
 * whole list with `z.array(z.string().min(1).max(64))`, and a guest controls
 * its own `quizToken` attribute (the LiveKit token grants
 * `canUpdateOwnMetadata`), so ONE guest publishing a 65-character token makes
 * the whole batch invalid: the action answers `[]` and the host sees no score
 * for anybody, with no error. (200+ guests do the same by count.)
 *
 * Expected behavior: a malformed token is ignored on its own; the scores of
 * the valid tokens are still returned.
 *
 * Server Functions are POST endpoints addressed by the `Next-Action` id of the
 * production build, read from its server-reference manifest (so this spec
 * needs `pnpm build` output next to it, as the server it drives).
 */
const sandbox = new Sandbox()
const attempts: string[] = []
afterAll(async () => {
  const admin = await sandbox.admin()
  for (const id of attempts) await call('DELETE', `/api/quizAttempts/${id}`, { token: admin })
  await sandbox.cleanup()
})

const manifest = JSON.parse(
  readFileSync('.next/server/server-reference-manifest.json', 'utf8'),
) as { node: Record<string, { exportedName: string; filename: string }> }
const actionId = (name: string) =>
  Object.entries(manifest.node).find(
    ([, entry]) => entry.exportedName === name && entry.filename.includes('/quiz/actions'),
  )![0]

async function runAction(tourId: string, name: string, argument: unknown) {
  const res = await fetch(`${BASE}/en/tour/${tourId}/quiz`, {
    method: 'POST',
    headers: {
      'Next-Action': actionId(name),
      'content-type': 'text/plain;charset=UTF-8',
      accept: 'text/x-component',
      'x-forwarded-for': `10.80.${Math.floor(Math.random() * 250)}.7`,
    },
    body: JSON.stringify([argument]),
  })
  return res.text()
}

describe('groupQuizScores', () => {
  it('still scores the valid tokens when one guest sends a malformed one', async () => {
    // A tour that has a quiz: the one the e2e fixture seeds.
    const fixture = JSON.parse(readFileSync('.e2e-fixtures/tour-navigation-fixture.json', 'utf8'))
    const tourId = fixture.tourId as string
    const submitted = await runAction(tourId, 'submitQuizAttempt', {
      tourId,
      lng: 'en',
      stepsCompleted: 0,
      choices: {},
    })
    const token = /"token":"([^"]+)"/.exec(submitted)?.[1]
    expect(token).toBeTruthy()
    // The attempt is the spec's own row: removed in afterAll.
    const admin = await sandbox.admin()
    const attempt = await call('GET', `/api/quizAttempts?where[token][equals]=${token}&depth=0`, {
      token: admin,
    })
    for (const doc of attempt.json.docs ?? []) {
      attempts.push(doc.id)
    }

    const alone = await runAction(tourId, 'groupQuizScores', { tourId, tokens: [token] })
    expect(alone).toContain(`"token":"${token}"`)

    const withJunk = await runAction(tourId, 'groupQuizScores', {
      tourId,
      tokens: [token, 'x'.repeat(65)],
    })
    expect(withJunk).toContain(`"token":"${token}"`)
  })
})
