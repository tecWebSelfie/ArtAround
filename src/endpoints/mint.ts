import type { Endpoint } from 'payload'
import { mintServerClient } from '@/lib/mint/mint-server-client'
import { getModel, getOperation, uploadReferenceImage } from '@/lib/pascal/mint/client'
import {
  zGetModelPath,
  zGetOperationPath,
  zUploadReferenceImageBody,
} from '@/lib/pascal/mint/client/zod.gen'

/** Narrow SDK bridge. Paid generation decisions stay in the jobs endpoint. */
export const mintEndpoints: Endpoint[] = [
  {
    path: '/mint/v1/operations/:operationId',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const path = zGetOperationPath.safeParse(req.routeParams)
      if (!path.success) return Response.json({ error: path.error.message }, { status: 400 })
      const { data } = await getOperation({
        client: mintServerClient,
        path: path.data,
        throwOnError: true,
      })
      return Response.json(data)
    },
  },
  {
    path: '/mint/v1/models/:modelId',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const path = zGetModelPath.safeParse(req.routeParams)
      if (!path.success) return Response.json({ error: path.error.message }, { status: 400 })
      const { data } = await getModel({
        client: mintServerClient,
        path: path.data,
        throwOnError: true,
      })
      return Response.json(data)
    },
  },
  {
    path: '/mint/v1/reference-images',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const parsed = zUploadReferenceImageBody.safeParse(await req.json?.())
      if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })
      const { data } = await uploadReferenceImage({
        client: mintServerClient,
        body: parsed.data,
        throwOnError: true,
        headers: { 'Idempotency-Key': req.headers.get('Idempotency-Key') ?? crypto.randomUUID() },
      })
      return Response.json(data, { status: 201 })
    },
  },
]
