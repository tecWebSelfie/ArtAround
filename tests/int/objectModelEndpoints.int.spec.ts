import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { objectModelGenerationEndpoints } from '@/endpoints/objectModelGeneration'

const requestId = '1537177e-c7a4-4c6a-bb24-0102284b5e48'
function request(body: unknown) {
  return {
    user: { id: 'user' },
    routeParams: { id: 'object' },
    json: async () => body,
    payload: {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn().mockResolvedValue({ id: 'object' }),
      create: vi.fn().mockResolvedValue({ id: 'object' }),
      jobs: { queue: vi.fn().mockResolvedValue({ id: 'queued-job' }), run: vi.fn() },
    },
  }
}
async function call(req: ReturnType<typeof request>, path = '/:id/generate-model') {
  return objectModelGenerationEndpoints
    .find((endpoint) => endpoint.path === path)!
    .handler(req as unknown as PayloadRequest) as Promise<Response>
}
describe('thin generation command endpoint', () => {
  it('queues a preview job and returns its ID without waiting for the runner', async () => {
    const req = request({ action: 'start', requestId })
    expect((await call(req)).status).toBe(202)
    expect(req.payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'interactiveObjectModel',
        input: expect.objectContaining({ objectId: 'object', requestedBy: 'user', requestId }),
      }),
    )
    expect(req.payload.jobs.run).not.toHaveBeenCalled()
  })
  it('reuses pending/repeated submissions instead of creating another job', async () => {
    const req = request({ action: 'start', requestId })
    req.payload.find.mockResolvedValue({ docs: [{ id: 'existing-job' }] })
    expect(await (await call(req)).json()).toEqual({ id: 'existing-job' })
    expect(req.payload.jobs.queue).not.toHaveBeenCalled()
  })
  it('takes the operation ID from the completed preview job, never from browser input', async () => {
    const req = request({
      action: 'approve',
      requestId,
      previewJobId: 'preview-job',
      operationId: 'browser-value',
    })
    req.payload.findByID.mockResolvedValueOnce({ id: 'object' }).mockResolvedValueOnce({
      id: 'preview-job',
      workflowSlug: 'interactiveObjectModel',
      completedAt: '2026-10-17T10:00:00Z',
      input: { objectId: 'object' },
      taskStatus: {
        pollMintModelOperation: {
          'wait-preview': { output: { mintOperationId: 'server-operation' } },
        },
      },
    })
    expect((await call(req)).status).toBe(202)
    expect(req.payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'finalizeObjectModel',
        input: expect.objectContaining({ operationId: 'server-operation' }),
      }),
    )
  })
  it('rejects approval before the preview job completes', async () => {
    const req = request({ action: 'approve', requestId, previewJobId: 'preview-job' })
    req.payload.findByID.mockResolvedValueOnce({ id: 'object' }).mockResolvedValueOnce({
      workflowSlug: 'interactiveObjectModel',
      input: { objectId: 'object' },
    })
    expect((await call(req)).status).toBe(409)
    expect(req.payload.jobs.queue).not.toHaveBeenCalled()
  })
  it('suppresses automatic generation when creating an interactive object', async () => {
    const req = request({ name: 'A vase' })
    expect((await call(req, '/create-for-model')).status).toBe(201)
    expect(req.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { skipMintModelGeneration: true },
        overrideAccess: false,
      }),
    )
  })
  it('rejects malformed Mint bodies through the generated schema', async () => {
    const req = request({
      action: 'start',
      requestId,
      generation: { prompt: 'A vase', imageUrl: 'invalid' },
    })
    expect((await call(req)).status).toBe(400)
    expect(req.payload.jobs.queue).not.toHaveBeenCalled()
  })
})
