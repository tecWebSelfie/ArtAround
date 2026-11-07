import { z } from 'zod'
import { AUDIENCES, EXPANSION_ANGLES, MAX_EXPANSION_STEPS } from './expansion'

/** Text generation and read-aloud lookup must identify exactly the same saved version. */
export const VersionRequest = z
  .object({
    kind: z.literal('version'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    seconds: z.number().int().min(3).max(900),
    audience: z.enum(AUDIENCES),
    age: z.number().int().min(0).max(17).optional(),
  })
  .refine((request) => request.age === undefined || request.audience === 'children')

export const ExpansionRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('more'),
    angle: z.enum(EXPANSION_ANGLES),
    step: z.number().int().min(1).max(MAX_EXPANSION_STEPS).optional(),
    age: z.number().int().min(0).max(17).optional(),
  }),
  VersionRequest,
])
