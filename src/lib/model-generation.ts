import { z } from 'zod'
import { zGenerateModelBody, zReviseOperationBody } from '@/lib/pascal/mint/client/zod.gen'
import type { Job } from 'payload'

export const INTERACTIVE_MODEL_QUEUE = 'interactive-models'
export const MODEL_WORKFLOWS = ['interactiveObjectModel', 'finalizeObjectModel'] as const
export type ObjectModelJob = Job<(typeof MODEL_WORKFLOWS)[number]>

// Only the command envelope is ours; Mint bodies keep their generated schemas.
export const modelGenerationCommand = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    requestId: z.uuid(),
    generation: zGenerateModelBody.optional(),
  }),
  z.object({ action: z.literal('approve'), requestId: z.uuid(), previewJobId: z.string().min(1) }),
  z.object({
    action: z.literal('revise'),
    requestId: z.uuid(),
    previewJobId: z.string().min(1),
    revision: zReviseOperationBody,
  }),
])
export type ModelGenerationCommand = z.input<typeof modelGenerationCommand>
