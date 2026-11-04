import type { Where } from 'payload'
import type { ExpansionAngle, ExpansionRequest } from './expansion'

/**
 * How `/api/expand` finds saved `contentVariants`: the one answering a
 * request (so later visitors get it at once) and, for a further "Tell me
 * more", the earlier steps on the same angle that the new step continues.
 * Kept out of the route so the lookup keys can be tested.
 */

const ownerOf = (target: 'contents' | 'objects', id: string): Where =>
  target === 'contents' ? { content: { equals: id } } : { object: { equals: id } }

/** Older additions have no step: they count as the first one. */
const FIRST_STEP: Where = { or: [{ step: { equals: 1 } }, { step: { exists: false } }] }

/** Where to look for a saved variant answering the same request. */
export function variantWhere(
  target: 'contents' | 'objects',
  id: string,
  request: ExpansionRequest,
): Where {
  const keys: Where[] =
    request.kind === 'more'
      ? [
          { angle: { equals: request.angle } },
          (request.step ?? 1) === 1 ? FIRST_STEP : { step: { equals: request.step } },
        ]
      : [
          { difficulty: { equals: request.difficulty } },
          { durationSeconds: { equals: request.seconds } },
          { audience: { equals: request.audience } },
        ]
  return { and: [{ kind: { equals: request.kind } }, ownerOf(target, id), ...keys] }
}

/** The additions on `angle` before `step`, which the visitor has already read. */
export function previousStepsWhere(
  target: 'contents' | 'objects',
  id: string,
  angle: ExpansionAngle,
  step: number,
): Where {
  return {
    and: [
      { kind: { equals: 'more' } },
      ownerOf(target, id),
      { angle: { equals: angle } },
      { or: [{ step: { less_than: step } }, { step: { exists: false } }] },
    ],
  }
}
