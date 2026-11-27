import { afterAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A4): creating several contents about the same
 * object at the same time silently detaches most of them.
 *
 * `attachTo('objects', 'attachToObject')` (src/collections/Contents.ts) links a
 * new content by reading the object's `contents`, then writing back
 * `[...contents, newId]` in each request's own transaction (read-modify-write
 * on one array, no lock or `$push`). Parallel creates all read the same list,
 * and the last writers overwrite the others: every request answers 201, yet
 * the contents are missing from `objects.contents`, so tour navigation (which
 * reads that relation) treats them as stops about no object (unavailable) and
 * the object page does not list them.
 *
 * Correct behaviour: every content created with `attachToObject` is listed in
 * the object's `contents` once the requests have answered.
 */
const sandbox = new Sandbox()
const leftovers: { collection: string; id: string }[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const { collection, id } of leftovers)
    await call('DELETE', `/api/${collection}/${id}`, { token })
  await sandbox.cleanup()
})

describe('parallel attachToObject creates', () => {
  it('keeps every content attached to the object', async () => {
    const account = await sandbox.user('writer')
    // A fresh object (its creator needs a museum role: the account founds one),
    // so earlier specs' contents don't blur the count.
    const created = await call('POST', '/api/museums', {
      token: account.token,
      body: {
        name: `qa-${Math.random().toString(36).slice(2, 8)}`,
        shortDescription: 'qa',
        ticketInfo: { label: 'Tickets' },
        location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
      },
    })
    if (created.status !== 201) throw new Error(`museum create failed: ${created.status}`)
    const target = await call('POST', '/api/objects', {
      token: account.token,
      body: { name: `qa-race-${Math.random().toString(36).slice(2, 8)}` },
    })
    if (target.status !== 201) throw new Error(`object create failed: ${target.status}`)
    const objectId = target.json.doc.id as string
    leftovers.push(
      { collection: 'objects', id: objectId },
      { collection: 'museums', id: created.json.doc.id },
    )

    const replies = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        call('POST', '/api/contents', {
          token: account.token,
          body: {
            title: `qa-race-${index}`,
            body: richText('x'),
            difficulty: 'easy',
            rightsDeclaredAt: new Date().toISOString(),
            attachToObject: objectId,
          },
        }),
      ),
    )
    const ids = replies.filter((reply) => reply.status === 201).map((reply) => reply.json.doc.id)
    for (const id of ids) sandbox.track('contents', id)
    const stored = (await call('GET', `/api/objects/${objectId}?depth=0`)).json
    const attached = (stored.contents as string[]).filter((id) => ids.includes(id))
    expect({ created: ids.length, attached: attached.length }).toEqual({
      created: 6,
      attached: 6,
    })
  })
})
