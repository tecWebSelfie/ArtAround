import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * "Customize tour" without an account (`/api/tour-copy`): the copy is
 * written for the visitor with no author, so the route itself must keep
 * every access rule — the original read as the visitor, only stops the
 * editor offered them, the original's texts — and leave signed-in visitors
 * to their own REST save.
 */
vi.mock('server-only', () => ({}))
const api = vi.hoisted(() => ({
  user: null as null | { id: string },
  findByID: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  editorData: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  asViewer: async () => ({ user: api.user, overrideAccess: false }),
  getSession: async () => ({
    payload: { findByID: api.findByID, create: api.create, find: api.find },
    user: api.user,
  }),
}))
vi.mock('@/lib/rate-limit', () => ({ allowRequest: () => true }))
vi.mock('@/app/[lng]/(frontend)/tour/tour-editing', () => ({
  getTourEditorData: api.editorData,
}))
const { POST } = await import('@/app/api/tour-copy/route')

const source = {
  id: 'tour-1',
  title: 'Original',
  description: 'Its description',
  logistics: 'Tickets at the desk',
  museum: 'museum-1',
  thumbnail: 'cover-1',
  startEntrance: 'door-1',
  contents: ['a', 'b', 'c'],
  directions: [
    { content: 'a', text: 'Left of the stairs' },
    { content: 'b', text: 'Room 2' },
  ],
}
const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/tour-copy', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  api.user = null
  api.findByID.mockResolvedValue(source)
  api.editorData.mockResolvedValue({
    candidates: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  })
  api.create.mockResolvedValue({ id: 'copy-1' })
  api.find.mockResolvedValue({ docs: [] })
})

describe('anonymous tour copies', () => {
  it('save the chosen stops with the original’s texts, unowned and unlisted', async () => {
    const response = await post({
      from: 'tour-1',
      contents: ['a', 'c'],
      startEntrance: 'door-1',
      // Ignored: an anonymous request can't write its own text.
      title: 'Spam',
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: 'copy-1', museumId: 'museum-1' })
    expect(api.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'tours', id: 'tour-1', overrideAccess: false }),
    )
    const { data } = api.create.mock.calls[0]![0]
    expect(data).toEqual({
      title: 'Original',
      description: 'Its description',
      logistics: 'Tickets at the desk',
      startEntrance: 'door-1',
      // Only the kept stops' notes whose previous stop is unchanged: a still
      // comes first; b's note leaves with b.
      directions: [{ content: 'a', text: 'Left of the stairs' }],
      contents: ['a', 'c'],
      museum: 'museum-1',
      thumbnail: 'cover-1',
      visitCopyOf: 'tour-1',
      visibility: 'public',
    })
    expect(data).not.toHaveProperty('author')
  })

  it('drop the first stop’s note when the copy starts from another entrance', async () => {
    // a's note says how to get there from door-1: wrong from door-2.
    await post({ from: 'tour-1', contents: ['a', 'b'], startEntrance: 'door-2' })
    expect(api.create.mock.calls[0]![0].data.directions).toEqual([{ content: 'b', text: 'Room 2' }])
  })

  it('reuse an identical anonymous copy instead of writing another', async () => {
    api.find.mockResolvedValue({
      docs: [
        { id: 'other', contents: ['c', 'a'], startEntrance: 'door-1' },
        { id: 'same', contents: ['a', 'c'], startEntrance: 'door-1' },
      ],
    })
    const response = await post({ from: 'tour-1', contents: ['a', 'c'], startEntrance: 'door-1' })
    await expect(response.json()).resolves.toEqual({ id: 'same', museumId: 'museum-1' })
    expect(api.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tours',
        where: { and: [{ visitCopyOf: { equals: 'tour-1' } }, { author: { equals: null } }] },
      }),
    )
    expect(api.create).not.toHaveBeenCalled()
  })

  it('refuse a stop the editor did not offer, or a repeated one', async () => {
    expect((await post({ from: 'tour-1', contents: ['a', 'private-x'] })).status).toBe(400)
    expect((await post({ from: 'tour-1', contents: ['a', 'a'] })).status).toBe(400)
    expect((await post({ from: 'tour-1', contents: [] })).status).toBe(400)
    expect(api.create).not.toHaveBeenCalled()
  })

  it('refuse an original the visitor can’t read (a private tour)', async () => {
    api.findByID.mockRejectedValue(new Error('Not Found'))
    expect((await post({ from: 'tour-private', contents: ['a'] })).status).toBe(404)
    expect(api.create).not.toHaveBeenCalled()
  })

  it('are not for signed-in visitors, whose copy is their own private tour', async () => {
    api.user = { id: 'u1' }
    expect((await post({ from: 'tour-1', contents: ['a'] })).status).toBe(409)
    expect(api.create).not.toHaveBeenCalled()
  })
})
