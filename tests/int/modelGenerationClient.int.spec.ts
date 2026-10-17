import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  modelGenerationMutationOptions,
  modelGenerationOptions,
} from '@/lib/model-generation-client'

const api = vi.hoisted(() => ({ request: vi.fn(), findByID: vi.fn(), find: vi.fn() }))
vi.mock('@/payload-sdk', () => ({ payloadSdk: api }))
beforeEach(() => {
  vi.clearAllMocks()
  api.request.mockResolvedValue({ json: async () => ({}) })
})
describe('native Payload job observation', () => {
  it('validates generated revision input before sending a request', async () => {
    const options = modelGenerationMutationOptions(new QueryClient())
    await expect(
      options.mutationFn!(
        {
          objectId: 'object',
          command: {
            action: 'revise',
            previewJobId: 'preview',
            requestId: '1537177e-c7a4-4c6a-bb24-0102284b5e48',
            revision: { feedback: 'x'.repeat(2001) },
          },
        },
        {} as never,
      ),
    ).rejects.toThrow()
    expect(api.request).not.toHaveBeenCalled()
  })
  it('reads a returned job ID through native findByID and refreshes saved objects', async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    api.findByID.mockResolvedValue({
      id: 'final-job',
      workflowSlug: 'finalizeObjectModel',
      completedAt: '2026-10-17T10:00:00Z',
    })
    const options = modelGenerationOptions('object', client, 'final-job')
    await client.fetchQuery(options)
    expect(api.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payload-jobs', id: 'final-job' }),
      expect.anything(),
    )
    expect(api.request).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['object-library'] })
  })
  it('uses native collection queries to restore the latest job after reopening', async () => {
    api.find.mockResolvedValue({ docs: [{ id: 'preview-job' }] })
    const client = new QueryClient()
    expect(await client.fetchQuery(modelGenerationOptions('object', client))).toMatchObject({
      id: 'preview-job',
    })
    expect(api.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payload-jobs' }),
      expect.anything(),
    )
  })
})
