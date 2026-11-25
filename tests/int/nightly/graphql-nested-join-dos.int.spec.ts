import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-19 (area D3, GraphQL): an anonymous nested query takes
 * the server down.
 *
 * POST /api/graphql has no depth or complexity limit that applies to join
 * fields. `Contents.author` → `Users.authoredContents` (a join, 10 docs per
 * level) → `author` → … multiplies the work by about 10 per level:
 * 2 levels take ~2 s, 3 levels ~20 s, 4 levels never answer and the Node
 * process dies (the socket closes and every later request is refused until a
 * restart). Needs no account.
 *
 * Correct behaviour: such a query is rejected (a GraphQL error / 4xx) or
 * answered quickly. Here a 3-level query must answer within 8 s; a spec that
 * ran the 4-level query would kill the server under test, so it stops at 3.
 */
const nest = (levels: number) => {
  let selection = 'id'
  for (let i = 0; i < levels; i++) selection = `author{authoredContents{docs{${selection}}}}`
  return `{Contents(limit:50){docs{${selection}}}}`
}

describe('GraphQL nested join query', () => {
  it('is rejected or answered within seconds', async () => {
    const started = Date.now()
    const res = await fetch(BASE + '/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: nest(3) }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)
    expect(res, 'no answer within 8 s').not.toBeNull()
    await res?.text()
    expect(Date.now() - started).toBeLessThan(8000)
  }, 30_000)
})
