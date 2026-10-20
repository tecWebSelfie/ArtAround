import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowHandler, TaskHandler } from 'payload'
import type { ModelGenerationOperation } from '@/lib/pascal/mint/client/types.gen'
import {
  interactiveObjectModelWorkflow,
  finalizeObjectModelWorkflow,
} from '@/jobs/interactiveObjectModelWorkflow'
import { pollMintModelOperation } from '@/tasks/pollMintModelOperation'
import { modelGenerationCommand } from '@/lib/model-generation'
import {
  objectAsset,
  placeableObjectAsset,
  upgradeDefaultModelNode,
  usesDefaultModel,
} from '@/lib/pascal/object-assets'
import { createObject } from '@/mocks/object.mock'

const mint = vi.hoisted(() => ({
  getOperation: vi.fn(),
  approveOperation: vi.fn(),
  reviseOperation: vi.fn(),
}))
vi.mock('@/lib/mint/mint-server-client', () => ({ mintServerClient: {} }))
vi.mock('@/lib/pascal/mint/client', () => mint)
const operation = (status: ModelGenerationOperation['status']): ModelGenerationOperation => ({
  object: 'operation',
  id: 'mint-operation',
  type: 'model_generation',
  generationMode: 'review',
  status,
  resource: { type: 'model', id: 'mint-model' },
  createdAt: '2026-10-17T10:00:00Z',
  updatedAt: '2026-10-17T10:00:00Z',
})
function harness(action = 'start') {
  const tasks = {
    loadObjectGenerationContext: vi.fn().mockResolvedValue({ prompt: 'A marble statue' }),
    startMintModelGeneration: vi.fn().mockResolvedValue({ mintOperationId: 'mint-operation' }),
    pollMintModelOperation: vi.fn().mockResolvedValue({ mintModelId: 'mint-model' }),
    persistMintModelAssets: vi.fn().mockResolvedValue({ objectsModelId: 'saved-model' }),
  }
  const args = {
    job: {
      id: 'job',
      input: {
        action,
        objectId: 'object',
        requestedBy: 'user',
        operationId: 'mint-operation',
        prompt: 'A marble statue',
        revision: { feedback: 'Use bronze' },
        requestId: 'request',
      },
    },
    req: {},
    tasks,
    inlineTask: async (_id: string, options: { task: () => Promise<{ output: unknown }> }) =>
      (await options.task()).output,
  }
  return { args, tasks }
}
async function run(h: ReturnType<typeof harness>, final = false) {
  const handler = final
    ? finalizeObjectModelWorkflow.handler
    : interactiveObjectModelWorkflow.handler
  if (typeof handler !== 'function') throw new Error('Expected workflow function')
  await handler(
    h.args as unknown as Parameters<
      WorkflowHandler<'interactiveObjectModel' & 'finalizeObjectModel'>
    >[0],
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mint.getOperation.mockResolvedValue({ data: operation('preview_ready') })
  mint.approveOperation.mockResolvedValue({ data: operation('running') })
  mint.reviseOperation.mockResolvedValue({ data: operation('running') })
})
afterEach(() => vi.useRealTimers())

describe('two-phase model workflows', () => {
  it('waits for the preview in the preparation job without approving or persisting', async () => {
    const h = harness()
    await run(h)
    expect(h.tasks.startMintModelGeneration).toHaveBeenCalledWith(
      'start-mint',
      expect.objectContaining({ input: expect.objectContaining({ review: true }) }),
    )
    expect(h.tasks.pollMintModelOperation).toHaveBeenCalledWith('wait-preview', {
      input: { stage: 'preview', objectId: 'object', mintOperationId: 'mint-operation' },
    })
    expect(mint.approveOperation).not.toHaveBeenCalled()
    expect(h.tasks.persistMintModelAssets).not.toHaveBeenCalled()
  })
  it('waits for a revised preview without starting final generation', async () => {
    const h = harness('revise')
    await run(h)
    expect(mint.reviseOperation).toHaveBeenCalledWith(
      expect.objectContaining({ body: { feedback: 'Use bronze' } }),
    )
    expect(h.tasks.startMintModelGeneration).not.toHaveBeenCalled()
    expect(h.tasks.pollMintModelOperation).toHaveBeenCalledWith('wait-preview', expect.anything())
    expect(mint.approveOperation).not.toHaveBeenCalled()
  })
  it('approves, waits for the final model, then persists in the finalization job', async () => {
    const h = harness()
    await run(h, true)
    expect(mint.approveOperation).toHaveBeenCalledTimes(1)
    expect(h.tasks.pollMintModelOperation).toHaveBeenCalledWith(
      'wait-model',
      expect.objectContaining({ input: expect.objectContaining({ stage: 'final' }) }),
    )
    expect(h.tasks.persistMintModelAssets).toHaveBeenCalledWith(
      'persist-assets',
      expect.objectContaining({ input: expect.objectContaining({ mintModelId: 'mint-model' }) }),
    )
  })
  it('recovers an uncertain approval response without approving twice', async () => {
    mint.getOperation.mockResolvedValue({ data: operation('running') })
    const h = harness()
    await run(h, true)
    expect(mint.approveOperation).not.toHaveBeenCalled()
    expect(h.tasks.persistMintModelAssets).toHaveBeenCalledTimes(1)
  })
})

async function poll(stage: 'preview' | 'final') {
  const handler = pollMintModelOperation.handler
  if (typeof handler !== 'function') throw new Error('Expected task function')
  return handler({
    input: { objectId: 'object', mintOperationId: 'mint-operation', stage },
  } as Parameters<TaskHandler<'pollMintModelOperation'>>[0])
}
describe('Mint waiting task', () => {
  it('does not finish while Mint is still building the preview', async () => {
    vi.useFakeTimers()
    mint.getOperation
      .mockResolvedValueOnce({ data: operation('running') })
      .mockResolvedValue({ data: operation('preview_ready') })
    let completed = false
    const result = poll('preview').then((value) => {
      completed = true
      return value
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(completed).toBe(false)
    await vi.advanceTimersByTimeAsync(2000)
    expect(await result).toMatchObject({ output: { operation: { status: 'preview_ready' } } })
  })
  it('waits for reserved credits to settle before reporting final success', async () => {
    vi.useFakeTimers()
    const unsettled = {
      ...operation('succeeded'),
      credits: { estimated: 1, reserved: 1, finalized: 0, availableAfterReservation: null },
    } satisfies ModelGenerationOperation
    mint.getOperation
      .mockResolvedValueOnce({ data: unsettled })
      .mockResolvedValue({ data: operation('succeeded') })
    const result = poll('final')
    await vi.advanceTimersByTimeAsync(2000)
    expect(await result).toMatchObject({ output: { mintModelId: 'mint-model' } })
    expect(mint.getOperation).toHaveBeenCalledTimes(2)
  })
  it('records a billing pause as an error without approving anything', async () => {
    mint.getOperation.mockResolvedValue({ data: operation('billing_required') })
    await expect(poll('preview')).rejects.toThrow('billing_required')
    expect(mint.approveOperation).not.toHaveBeenCalled()
  })
})

describe('generated contracts and asset adapter', () => {
  it('keeps local Payload uploads away from Pascal CDN resolution', () => {
    const asset = objectAsset(
      createObject({
        model: {
          id: 'saved-model',
          userGenerated: false,
          url: '/api/objectsModels/file/model.glb',
          createdAt: '2026-10-17',
          updatedAt: '2026-10-17',
        },
      }),
    )
    expect(asset?.src).toBe(
      new URL(
        '/api/objectsModels/file/model.glb',
        process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000',
      ).href,
    )
    expect(asset?.source).toBe('library')
  })
  // Objects without a Mint model are placed as the default standee, keeping
  // their Payload ID, and the real model replaces it once it exists.
  it('places model-less objects as the default standee and upgrades them later', () => {
    const pending = createObject({ model: null })
    const asset = placeableObjectAsset(pending)
    expect(objectAsset(pending)).toBeNull()
    expect(asset).toMatchObject({ id: pending.id, category: 'museum-objects' })
    expect(usesDefaultModel(asset)).toBe(true)

    const node = { id: 'item_1', position: [1, 0, 2], asset }
    expect(upgradeDefaultModelNode(node, pending)).toBe(node)
    const ready = createObject({
      id: pending.id,
      model: {
        id: 'saved-model',
        userGenerated: false,
        url: '/api/objectsModels/file/model.glb',
        createdAt: '2026-10-17',
        updatedAt: '2026-10-17',
      },
    })
    const upgraded = upgradeDefaultModelNode(node, ready)
    expect(upgraded.position).toEqual([1, 0, 2])
    expect(upgraded.asset).toMatchObject({ id: pending.id, src: objectAsset(ready)?.src })
    expect(usesDefaultModel(upgraded.asset)).toBe(false)
  })
  it('retains generated image-count validation in the browser/server command', () => {
    const requestId = '1537177e-c7a4-4c6a-bb24-0102284b5e48'
    expect(
      modelGenerationCommand.safeParse({
        action: 'start',
        requestId,
        generation: { prompt: 'A vase', sourceImages: ['https://example.com/a.png'] },
      }).success,
    ).toBe(false)
    expect(
      modelGenerationCommand.safeParse({
        action: 'start',
        requestId,
        generation: {
          prompt: 'A vase',
          sourceImages: ['https://example.com/a.png', 'https://example.com/b.png'],
        },
      }).success,
    ).toBe(true)
  })
  it('never creates phantom assets for objects without models', () =>
    expect(objectAsset(createObject())).toBeNull())
})
