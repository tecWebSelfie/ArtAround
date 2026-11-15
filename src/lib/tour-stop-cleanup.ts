import { relationshipIds, refreshSearchDocs } from '@/lib/search-index'
import { tourQuizQuestionIds } from '@/lib/quiz-ownership'
import { computeVisitableContentIds, visitableFields } from '@/lib/visitable-stops'
import type { Museum, Tour } from '@/payload-types'
import type { Payload, PayloadRequest } from 'payload'

/**
 * A deleted content disappears from every tour that lists it (only a hard
 * delete: an object leaving the map or a detached content stays derived and
 * reversible, `visitable-stops.ts`). Called from `Contents.afterDelete` after
 * `detachDeletedContentFromQuestions`, and by the visitable-stops backfill for
 * ids that were deleted before this cleanup existed.
 *
 * It is a system cleanup, not an edit by the author, so it writes straight to
 * the database adapter (`db.updateOne`, joined to the caller's transaction
 * through `req`), like the derived-stops refresh does. That is the cleanest way
 * past the rules that guard author edits and would otherwise refuse it:
 * `validateTourStops` (minimum stops), `required`/`minRows: 1` on `contents`,
 * `validateQuizQuestions`, and the tours' hooks (translation, search, etc.).
 * The consequence is deliberate: a tour whose only stop was deleted is KEPT
 * with an empty `contents` (never deleted automatically). It has 0 visitable
 * stops, so `LISTED_TOURS` hides it everywhere, and its author still reaches
 * it from their own profile to fix it (the editor asks for stops on next save).
 *
 * Per tour it keeps three things consistent in one write:
 * - `contents` without the id;
 * - `directions` without the stop's note (read with `locale: 'all'` because
 *   the notes are localized and the adapter takes the stored shape);
 * - `quiz.questions` without the questions that no longer concern a content
 *   of the tour (the invariant `validateQuizQuestions` enforces on saves).
 *   Questions deleted with the content are already out of the quiz
 *   (`detachDeletedQuestionFromTours`); a question that also concerns other
 *   contents survives in the quiz while one of them is still a stop. Tour-owned
 *   questions (empty `relatedTo`) are untouched.
 * The derived visitable stops and the search row (price too) are recomputed
 * for the same tours. Purchases are never touched.
 * Returns the ids of the tours changed.
 */
export async function removeContentsFromTours({
  payload,
  req,
  contentIds,
}: {
  payload: Payload
  req?: PayloadRequest
  contentIds: string[]
}): Promise<string[]> {
  const gone = new Set(contentIds.filter(Boolean))
  if (!gone.size) return []
  const { docs } = await payload.find({
    collection: 'tours',
    where: { contents: { in: [...gone] } },
    select: {
      contents: true,
      directions: true,
      quiz: true,
      museum: true,
      author: true,
    },
    depth: 0,
    locale: 'all',
    pagination: false,
    overrideAccess: true,
    req,
  })
  // The quiz questions of all these tours in one read (not one per tour): which
  // contents each one is about decides whether it still belongs to its tour.
  const questionIds = [...new Set(docs.flatMap((tour) => tourQuizQuestionIds(tour)))]
  const related = new Map<string, string[]>()
  if (questionIds.length) {
    const { docs: questions } = await payload.find({
      collection: 'quizQuestions',
      where: { id: { in: questionIds } },
      select: { relatedTo: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    for (const q of questions) related.set(String(q.id), relationshipIds(q.relatedTo))
  }
  const changed: string[] = []
  const museums = new Map<string, Promise<Pick<Museum, 'map'> | null>>()
  for (const tour of docs) {
    const contents = relationshipIds(tour.contents).filter((id) => !gone.has(id))
    const kept = new Set(contents)

    // Questions still about this tour: tour-owned ones, or one of whose
    // remaining related contents is a stop. A question already deleted (absent
    // from `related`) leaves the quiz too (dangling id).
    const quizQuestions = tourQuizQuestionIds(tour).filter((id) => {
      const contentsOfQuestion = related.get(id)
      if (!contentsOfQuestion) return false
      return !contentsOfQuestion.length || contentsOfQuestion.some((c) => kept.has(c))
    })

    const ids = await computeVisitableContentIds(
      payload,
      req,
      { contents, museum: tour.museum, author: tour.author } as Pick<
        Tour,
        'contents' | 'museum' | 'author'
      >,
      museums,
    )
    await payload.db.updateOne({
      collection: 'tours',
      id: tour.id,
      data: {
        contents,
        directions: (tour.directions ?? []).filter(
          (row) => !gone.has(relationshipIds([row.content])[0]),
        ),
        ...(tour.quiz ? { quiz: { questions: quizQuestions } } : {}),
        ...visitableFields(ids),
      },
      returning: false,
      req,
    })
    changed.push(String(tour.id))
  }
  // Search is derived data: never fail (and roll back) the content's deletion over it.
  try {
    await refreshSearchDocs({ payload, collection: 'tours', ids: changed, req })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Could not refresh the search rows of tours' })
  }
  return changed
}
