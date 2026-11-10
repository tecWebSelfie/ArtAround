import { z } from 'zod'
import { AUDIENCES, EXPANSION_ANGLES, MAX_EXPANSION_STEPS } from './expansion'
import { ChildAge } from './reading-profile'

/**
 * The requests `/api/expand` accepts, and the type of `ExpansionRequest`.
 * Text generation and read-aloud lookup must identify exactly the same saved version.
 */
export const VersionRequest = z
  .object({
    kind: z.literal('version'),
    // `seconds`: the version's target length (`src/lib/duration.ts`).
    difficulty: z.enum(['easy', 'medium', 'hard']),
    seconds: z.number().int().min(3).max(900),
    audience: z.enum(AUDIENCES),
    age: ChildAge.optional(),
  })
  .refine((request) => request.age === undefined || request.audience === 'children')

export const ExpansionRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('more'),
    angle: z.enum(EXPANSION_ANGLES),
    // 1 for the first addition, then 2, 3… each continuing the last.
    step: z.number().int().min(1).max(MAX_EXPANSION_STEPS).optional(),
    age: ChildAge.optional(),
  }),
  VersionRequest,
])
