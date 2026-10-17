import { mintServerClient } from '@/lib/mint'
import { getOperation } from '@/lib/pascal/mint/client'
import { TaskConfig } from 'payload'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Bounded polling budget per task attempt: 2s → ×1.5 backoff, capped at 15s,
 * for a maximum of 60 tries (~12 minutes). If the operation is still running
 * when the budget runs out the task throws and the job retries — because
 * `startMintModelGeneration` will then re-return its cached output, no *new*
 * generation is started; this task just re-polls with a fresh budget.
 */
const MAX_POLLS = 60
const INITIAL_INTERVAL_MS = 2_000
const INTERVAL_BACKOFF = 1.5
const MAX_INTERVAL_MS = 15_000

/**
 * Step 3 of generateObjectModel: poll `GET /v1/operations/{operationId}` until
 * the Mint operation reaches a terminal state and return the generated model
 * id. Mint itself takes minutes per model, hence the generous budget.
 * Terminal failure (`failed` / `canceled`) throws so the job records the
 * error; regenerating simply means queueing a new workflow run.
 */
export const pollMintModelOperation: TaskConfig<'pollMintModelOperation'> = {
  slug: 'pollMintModelOperation',
  label: 'Poll Mint operation until the model is ready',
  inputSchema: [
    { name: 'mintOperationId', type: 'text', required: true },
    { name: 'objectId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'mintModelId', type: 'text', required: true },
    { name: 'mintOperationId', type: 'text', required: true },
  ],
  // Mint operations take minutes — one retry is enough to ride out a
  // transient network error; a permanently failed operation is not worth
  // re-polling more than once.
  retries: 1,
  handler: async ({ input, req }) => {
    let intervalMs = INITIAL_INTERVAL_MS

    for (let poll = 1; poll <= MAX_POLLS; poll++) {
      const { data: operation } = await getOperation({
        client: mintServerClient,
        path: { operationId: input.mintOperationId },
        throwOnError: true,
      })

      switch (operation.status) {
        case 'succeeded':
        case 'partially_succeeded': {
          if (!operation.resource) {
            throw new Error(
              `Mint operation ${operation.id} succeeded but produced no model resource`,
            )
          }
          return {
            output: {
              mintModelId: operation.resource.id,
              mintOperationId: operation.id,
            },
          }
        }
        case 'preview_ready':
          // We always run in 'auto' mode, so a pause like this is unexpected.
          throw new Error(
            `Mint operation ${operation.id} paused at preview_ready; expected 'auto' generation mode`,
          )
        case 'billing_required':
          // Deliberately no auto-resume (resumeOperation): topping up is a
          // human decision on the Mint platform, never an automatic retry.
          req.payload.logger.error({
            msg: 'Mint operation paused for billing; no credits left to continue',
            objectId: input.objectId,
            mintOperationId: operation.id,
            billingReason: operation.billing?.reason ?? 'unknown',
          })
          throw new Error(
            `Generation paused: Mint account needs credits or an active plan (operation ${operation.id})`,
          )
        case 'failed':
        case 'canceled':
          throw new Error(
            `Mint operation ${operation.id} ended with status '${operation.status}' for object ${input.objectId}`,
          )
        default:
          // queued / running — keep waiting.
          await sleep(intervalMs)
          intervalMs = Math.min(intervalMs * INTERVAL_BACKOFF, MAX_INTERVAL_MS)
      }
    }

    throw new Error(
      `Mint operation ${input.mintOperationId} still running after ${MAX_POLLS} polls; job retry will re-enter polling`,
    )
  },
}
