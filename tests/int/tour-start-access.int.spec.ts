import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

// Paid-body field access is the entitlement signal these navigation entry points rely on.
vi.mock('server-only', () => ({}))
const permissions = vi.hoisted(() => ({ can: vi.fn() }))
vi.mock('@/lib/session', () => ({
  asViewer: async () => ({ user: { id: 'visitor' }, overrideAccess: false }),
  can: (...args: unknown[]) => permissions.can(...args),
}))

const { getStartableTourIds, getTourStartAccess, getTourStartAccessById } =
  await import('@/lib/tour-start-access')
const payload = { find: vi.fn(), findByID: vi.fn() } as unknown as Payload

beforeEach(() => {
  vi.clearAllMocks()
  permissions.can.mockResolvedValue(false)
  vi.mocked(payload.find).mockResolvedValue({ docs: [] } as never)
  vi.mocked(payload.findByID).mockResolvedValue({ id: 'tour', contents: ['paid'] } as never)
})

describe('paid-tour start access', () => {
  it('blocks a paid stop whose body Payload withheld from the visitor', async () => {
    vi.mocked(payload.find).mockResolvedValue({
      docs: [{ id: 'paid', price: 450, body: null }],
    } as never)

    await expect(getTourStartAccess(payload, 'tour', ['paid'])).resolves.toEqual({
      lockedPrice: 450,
      canStart: false,
    })
    expect(permissions.can).toHaveBeenCalledWith('tours', 'tour', 'update')
  })

  it('reads only stop IDs (and which are visitable) for the group-room check', async () => {
    vi.mocked(payload.find).mockResolvedValue({
      docs: [{ id: 'paid', price: 450, body: null }],
    } as never)

    await expect(getTourStartAccessById(payload, 'tour')).resolves.toMatchObject({
      lockedPrice: 450,
      canStart: false,
    })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tours',
        depth: 0,
        select: { contents: true, visitableContents: true },
        overrideAccess: false,
      }),
    )
  })

  it('allows a tour editor to lead a tour with locked stops', async () => {
    vi.mocked(payload.find).mockResolvedValue({
      docs: [{ id: 'paid', price: 450, body: null }],
    } as never)
    permissions.can.mockResolvedValue(true)

    await expect(getTourStartAccess(payload, 'tour', ['paid'])).resolves.toMatchObject({
      lockedPrice: 450,
      canStart: true,
    })
  })

  it('keeps free and owned stops startable but omits locked tours from the map commands', async () => {
    vi.mocked(payload.find).mockResolvedValue({
      docs: [
        { id: 'free', price: 0, body: { root: {} } },
        { id: 'owned', price: 450, body: { root: {} } },
        { id: 'locked', price: 450, body: null },
      ],
    } as never)

    await expect(
      getStartableTourIds(payload, [
        { id: 'free-tour', contents: ['free'] },
        { id: 'owned-tour', contents: ['owned'] },
        { id: 'locked-tour', contents: ['locked'] },
      ]),
    ).resolves.toEqual(new Set(['free-tour', 'owned-tour']))
  })

  it('ignores a locked paid stop that is no longer visitable', async () => {
    // Navigation never shows a stop off the map (`withVisitableStops`), so it
    // can't lock the tour either.
    vi.mocked(payload.find).mockResolvedValue({
      docs: [
        { id: 'free', price: 0, body: { root: {} } },
        { id: 'locked', price: 450, body: null },
      ],
    } as never)

    await expect(
      getStartableTourIds(payload, [
        { id: 'tour', contents: ['free', 'locked'], visitableContents: ['free'] },
      ]),
    ).resolves.toEqual(new Set(['tour']))
  })

  it('fails closed when any stop cannot be resolved', async () => {
    await expect(getTourStartAccess(payload, 'tour', ['missing'])).resolves.toEqual({
      lockedPrice: 0,
      canStart: false,
    })
  })
})
