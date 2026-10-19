import type { ObjectModelJob } from '@/lib/model-generation'
import type { ModelAssets, ModelGenerationOperation } from '@/lib/pascal/mint/client/types.gen'
import { http, HttpResponse } from 'msw'
import { createObject } from './object.mock'

const timestamp = '2026-10-17T10:00:00.000Z'
// Placeholder GLB for the mocked Mint model assets: any public asset works, and
// this is the small plate mesh the museum map plugin already ships.
const PLACEHOLDER_MODEL = '/models/exitEntrance.glb'
const illustration =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#f1f3f5"/><path d="M215 65h50l-7 40c55 24 70 130 16 170h-68c-54-40-39-146 16-170z" fill="#bc8c54" stroke="#6e5031" stroke-width="5"/><path d="M218 120c-65-40-65 70-20 78m64-78c65-40 65 70 20 78" fill="none" stroke="#6e5031" stroke-width="9"/><path d="M200 213h80M203 225h74" stroke="#6e5031" stroke-width="5"/><ellipse cx="240" cy="293" rx="73" ry="10" fill="#dee2e6"/></svg>',
  )
const modelAssets: ModelAssets = {
  fbxUrl: null,
  glbUrl: PLACEHOLDER_MODEL,
  glbSizeBytes: null,
  objUrl: null,
  optimizedGlbUrl: null,
  optimizedGlbSizeBytes: null,
  previewImageUrl: illustration,
  stlUrl: null,
  thumbnailUrl: illustration,
  usdzUrl: null,
  bounds: null,
}
export const mockMintPreview: ModelGenerationOperation = {
  object: 'operation',
  id: 'mint-preview',
  type: 'model_generation',
  generationMode: 'review',
  status: 'preview_ready',
  resource: { type: 'model', id: 'mint-model' },
  assets: modelAssets,
  createdAt: timestamp,
  updatedAt: timestamp,
}
export const objectWithoutModel = createObject({
  id: 'catalog-object',
  name: 'Attic amphora',
  description: 'A terracotta amphora with two handles.',
  thumbnail: null,
  model: null,
})
export const objectWithModel = createObject({
  ...objectWithoutModel,
  model: {
    id: 'saved-model',
    userGenerated: false,
    url: PLACEHOLDER_MODEL,
    thumbnail: {
      id: 'preview-thumbnail',
      alt: 'Amphora model',
      url: 'http://localhost:6006/icons/cube.webp',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  },
})
type Phase = 'new' | 'preview' | 'finalizing' | 'ready' | 'failed'
export function mockModelJob(phase: Exclude<Phase, 'new'>): ObjectModelJob {
  const final = phase === 'finalizing' || phase === 'ready'
  const job = {
    id: final ? 'final-job' : 'preview-job',
    workflowSlug: final ? 'finalizeObjectModel' : 'interactiveObjectModel',
    input: {
      objectId: objectWithoutModel.id,
      requestedBy: 'story-user',
      requestId: '1537177e-c7a4-4c6a-bb24-0102284b5e48',
      prompt: objectWithoutModel.description,
      ...(final
        ? { previewJobId: 'preview-job', operationId: 'mint-preview' }
        : { action: 'start' }),
    },
    processing: phase === 'finalizing',
    hasError: phase === 'failed',
    ...(phase === 'preview' || phase === 'ready' ? { completedAt: timestamp } : {}),
    ...(phase === 'failed' ? { error: { message: 'Mint could not prepare this preview.' } } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
    totalTried: 1,
    taskStatus: {
      loadObjectGenerationContext: {
        'load-context': {
          complete: true,
          totalTried: 1,
          taskSlug: 'loadObjectGenerationContext',
          input: { objectId: objectWithoutModel.id },
          output: { prompt: objectWithoutModel.description },
        },
      },
      ...(final
        ? {
            persistMintModelAssets: {
              'persist-assets': {
                complete: phase === 'ready',
                totalTried: 1,
                taskSlug: 'persistMintModelAssets',
                input: {},
                output: { objectsModelId: 'saved-model' },
              },
            },
          }
        : {
            pollMintModelOperation: {
              'wait-preview': {
                complete: phase === 'preview',
                totalTried: 1,
                taskSlug: 'pollMintModelOperation',
                input: {
                  stage: 'preview',
                  objectId: objectWithoutModel.id,
                  mintOperationId: 'mint-preview',
                },
                output: {
                  mintOperationId: 'mint-preview',
                  mintModelId: 'mint-model',
                  operation: mockMintPreview,
                },
              },
            },
          }),
    },
  }
  return job as unknown as ObjectModelJob
}

export function modelGenerationHandlers(
  initialPhase: Phase = 'new',
  empty = false,
  failLibrary = false,
) {
  let phase = initialPhase
  const jobs = new Map<string, ObjectModelJob>()
  if (phase !== 'new') {
    const job = mockModelJob(phase)
    jobs.set(String(job.id), job)
  }
  const currentObject = () => (phase === 'ready' ? objectWithModel : objectWithoutModel)
  const page = (docs: unknown[]) => ({
    docs,
    totalDocs: docs.length,
    totalPages: 1,
    page: 1,
    limit: 24,
    hasNextPage: false,
    hasPrevPage: false,
  })
  return [
    http.get('*/api/objects', () =>
      failLibrary
        ? HttpResponse.json({ errors: [{ message: 'Unavailable' }] }, { status: 503 })
        : HttpResponse.json(page(empty ? [] : [currentObject()])),
    ),
    http.get('*/api/objects/:id', () => HttpResponse.json(currentObject())),
    http.post('*/api/objects/create-for-model', () =>
      HttpResponse.json(objectWithoutModel, { status: 201 }),
    ),
    http.get('*/api/payload-jobs', () => HttpResponse.json(page([...jobs.values()].slice(-1)))),
    http.get('*/api/payload-jobs/run', () => HttpResponse.json({ message: 'Success' })),
    http.get('*/api/payload-jobs/:id', ({ params }) =>
      HttpResponse.json(jobs.get(String(params.id))),
    ),
    http.post('*/api/objects/:id/generate-model', async ({ request }) => {
      const body = (await request.json()) as { action: string }
      phase = body.action === 'approve' ? 'ready' : 'preview'
      const job = mockModelJob(phase)
      jobs.set(String(job.id), job)
      return HttpResponse.json(job, { status: 202 })
    }),
    http.get('*/api/mint/v1/operations/:id', () => HttpResponse.json(mockMintPreview)),
  ]
}
