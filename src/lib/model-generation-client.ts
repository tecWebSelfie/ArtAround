import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { payloadSdk } from '@/payload-sdk'
import { mintBrowserClient } from '@/lib/mint/mint-browser-client'
import { getOperationOptions } from '@/lib/pascal/mint/client/@tanstack/react-query.gen'
import { uploadReferenceImage } from '@/lib/pascal/mint/client'
import { zUploadReferenceImageBody } from '@/lib/pascal/mint/client/zod.gen'
import {
  INTERACTIVE_MODEL_QUEUE,
  MODEL_WORKFLOWS,
  modelGenerationCommand,
  type ModelGenerationCommand,
  type ObjectModelJob,
} from './model-generation'
import type { Object as MuseumObject } from '@/payload-types'

export const objectLibraryKey = ['object-library'] as const
export const objectModelJobKey = (objectId: string) => ['object-model-job', objectId] as const

export function objectLibraryOptions(search = '', page = 1) {
  return queryOptions({
    queryKey: [...objectLibraryKey, { search, page }],
    queryFn: ({ signal }) =>
      payloadSdk.find(
        {
          collection: 'objects',
          depth: 2,
          limit: 24,
          page,
          locale: 'en',
          sort: 'name',
          ...(search.trim() ? { where: { name: { contains: search.trim() } } } : {}),
        },
        { signal },
      ),
  })
}

export function modelObjectOptions(objectId: string) {
  return queryOptions({
    queryKey: ['model-object', objectId],
    enabled: Boolean(objectId),
    queryFn: ({ signal }) =>
      payloadSdk.findByID({ collection: 'objects', id: objectId, depth: 2 }, { signal }),
  })
}

export function createObjectOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['create-object-for-model'],
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await payloadSdk.request({
        method: 'POST',
        path: '/objects/create-for-model',
        json: data,
      })
      return response.json() as Promise<MuseumObject>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: objectLibraryKey }),
  })
}

/** Native Payload reads: an explicit ID polls that job; no ID restores the latest. */
export function modelGenerationOptions(objectId: string, queryClient: QueryClient, jobId?: string) {
  return queryOptions({
    queryKey: [...objectModelJobKey(objectId), jobId],
    enabled: Boolean(objectId),
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const job = jobId
        ? await payloadSdk.findByID({ collection: 'payload-jobs', id: jobId, depth: 0 }, { signal })
        : ((
            await payloadSdk.find(
              {
                collection: 'payload-jobs',
                depth: 0,
                limit: 1,
                sort: '-createdAt',
                where: {
                  and: [
                    { workflowSlug: { in: [...MODEL_WORKFLOWS] } },
                    { 'input.objectId': { equals: objectId } },
                  ],
                },
              },
              { signal },
            )
          ).docs[0] ?? null)
      // Filtered job collection reads have our workflow input/taskStatus contracts.
      const typedJob = job as ObjectModelJob | null
      if (
        typedJob?.workflowSlug === 'finalizeObjectModel' &&
        typedJob.completedAt &&
        !typedJob.hasError
      ) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: objectLibraryKey }),
          queryClient.invalidateQueries({ queryKey: ['model-object', objectId] }),
        ])
      }
      return typedJob
    },
    refetchInterval: (query) => {
      const job = query.state.data
      return job && !job.completedAt && !job.hasError ? 2_000 : false
    },
  })
}

export function modelGenerationMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['object-model-generation'],
    retry: false,
    mutationFn: async ({
      objectId,
      command,
    }: {
      objectId: string
      command: ModelGenerationCommand
    }) => {
      const response = await payloadSdk.request({
        method: 'POST',
        path: `/objects/${encodeURIComponent(objectId)}/generate-model`,
        json: modelGenerationCommand.parse(command),
      })
      return response.json() as Promise<ObjectModelJob>
    },
    onSuccess: (job) => {
      queryClient.setQueryData([...objectModelJobKey(job.input.objectId), undefined], job)
      queryClient.setQueryData([...objectModelJobKey(job.input.objectId), String(job.id)], job)
      // Built-in runner starts queued work now; autoRun is the server-side backup.
      // Its HTTP response waits for execution, so don't await it in the mutation.
      void payloadSdk
        .request({
          method: 'GET',
          path: `/payload-jobs/run?queue=${INTERACTIVE_MODEL_QUEUE}&limit=1&disableScheduling=true`,
        })
        .catch(() => undefined)
    },
  })
}

export function mintOperationOptions(operationId: string) {
  return queryOptions({
    ...getOperationOptions({ client: mintBrowserClient, path: { operationId } }),
    enabled: Boolean(operationId),
    staleTime: 0,
  })
}

export async function uploadModelReference(file: File, requestId: string) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Reference images must be at most 5 MB')
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.readAsDataURL(file)
  })
  const { data } = await uploadReferenceImage({
    client: mintBrowserClient,
    headers: { 'Idempotency-Key': requestId },
    body: zUploadReferenceImageBody.parse({
      base64Data,
      fileName: file.name,
      contentType: file.type,
    }),
    throwOnError: true,
  })
  if (!data.thumbnailUrl) throw new Error('Mint returned no usable reference image URL')
  return data.thumbnailUrl
}
