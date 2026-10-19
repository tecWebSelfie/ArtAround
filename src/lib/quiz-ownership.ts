import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  FilterOptionsProps,
  PayloadRequest,
  RelationshipFieldValidation,
  Where,
} from 'payload'
import { extractID, relationship } from 'payload/shared'
import type { Tour } from '@/payload-types'

/**
 * Quiz question ownership and cleanup, shared by `Tours`, `Contents` and
 * `QuizQuestions` hooks.
 *
 * Invariant: a question with an empty `relatedTo` belongs to exactly one tour,
 * the one whose `quiz.questions` lists it. Such a question is deleted when that
 * tour drops it or is deleted. A content-linked question is deleted only once
 * its last related content is deleted. Every nested Local API call passes `req`
 * so cleanup joins the triggering operation's transaction.
 */

type ID = string
type Ref = string | { id: string } | null | undefined

const ids = (refs: readonly Ref[] | null | undefined): ID[] =>
  (refs ?? []).filter(Boolean).map((ref) => String(extractID(ref as string | { id: string })))

/** Tour quiz question IDs, tolerant of populated and missing values. */
export const tourQuizQuestionIds = (tour: Pick<Tour, 'quiz'> | null | undefined): ID[] =>
  ids(tour?.quiz?.questions as Ref[] | undefined)

/**
 * Picker filter for `Tours.quiz.questions`. It reads the admin form `data`, so
 * contents added but not saved yet already widen the search. Already-selected
 * IDs stay valid: Payload re-applies `filterOptions` when validating saved
 * values, and tour-owned questions (empty `relatedTo`) match no content.
 */
export const quizQuestionFilterOptions = ({ data }: FilterOptionsProps): Where => ({
  or: [
    { relatedTo: { in: ids(data?.contents as Ref[] | undefined) } },
    { id: { in: tourQuizQuestionIds(data as Pick<Tour, 'quiz'>) } },
  ],
})

/**
 * Default relationship validation plus two ownership rules the picker filter
 * cannot enforce (its "already selected" clause would accept any ID sent
 * through the API):
 * - a content question must concern at least one content still in the tour;
 * - a tour-owned question must not already belong to another tour's quiz.
 */
export const validateQuizQuestions: RelationshipFieldValidation = async (value, options) => {
  const base = await relationship(value, options)
  if (base !== true) return base

  const { data, req, id } = options
  const selected = ids(value as Ref[] | null | undefined)
  if (!selected.length || !req?.payload) return true

  const contents = new Set(ids((data as Partial<Tour>)?.contents as Ref[] | undefined))
  const { docs } = await req.payload.find({
    collection: 'quizQuestions',
    where: { id: { in: selected } },
    depth: 0,
    limit: selected.length,
    pagination: false,
    select: { prompt: true, relatedTo: true },
    req,
  })

  const offTour = docs.filter((q) => {
    const related = ids(q.relatedTo as Ref[] | undefined)
    return related.length > 0 && !related.some((content) => contents.has(content))
  })
  if (offTour.length) {
    return `These questions concern contents no longer in the tour: ${offTour.map((q) => `«${q.prompt}»`).join(', ')}`
  }

  const owned = docs.filter((q) => !ids(q.relatedTo as Ref[] | undefined).length).map((q) => q.id)
  if (owned.length) {
    const otherTours = await req.payload.find({
      collection: 'tours',
      where: {
        and: [
          { 'quiz.questions': { in: owned } },
          ...(id ? [{ id: { not_equals: id } } satisfies Where] : []),
        ],
      },
      depth: 0,
      limit: 1,
      pagination: false,
      select: { title: true },
      req,
    })
    if (otherTours.docs.length) {
      return `Some tour-specific questions already belong to the quiz of «${otherTours.docs[0].title}»`
    }
  }
  return true
}

/** Deletes candidates that are tour-owned and no longer listed by any tour quiz. */
export async function deleteUnownedTourQuestions(req: PayloadRequest, candidates: ID[]) {
  if (!candidates.length) return
  const { docs } = await req.payload.find({
    collection: 'quizQuestions',
    where: { id: { in: candidates } },
    depth: 0,
    limit: candidates.length,
    pagination: false,
    select: { relatedTo: true },
    req,
  })
  const owned = docs.filter((q) => !ids(q.relatedTo as Ref[] | undefined).length).map((q) => q.id)
  if (!owned.length) return

  const { docs: tours } = await req.payload.find({
    collection: 'tours',
    where: { 'quiz.questions': { in: owned } },
    depth: 0,
    limit: 0,
    pagination: false,
    select: { quiz: true },
    req,
  })
  const stillUsed = new Set(tours.flatMap(tourQuizQuestionIds))
  const orphans = owned.filter((question) => !stillUsed.has(question))
  if (orphans.length) {
    await req.payload.delete({ collection: 'quizQuestions', where: { id: { in: orphans } }, req })
  }
}

/** Tours.afterChange: dropping a tour-owned question from the quiz deletes it. */
export const deleteQuestionsRemovedFromQuiz: CollectionAfterChangeHook<Tour> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const current = new Set(tourQuizQuestionIds(doc))
  await deleteUnownedTourQuestions(
    req,
    tourQuizQuestionIds(previousDoc).filter((question) => !current.has(question)),
  )
  return doc
}

/** Tours.afterDelete: the tour's own questions go with it. */
export const deleteQuestionsOfDeletedTour: CollectionAfterDeleteHook<Tour> = async ({
  doc,
  req,
}) => {
  await deleteUnownedTourQuestions(req, tourQuizQuestionIds(doc))
}

/**
 * Contents.afterDelete: unlink the content from its questions. A question left
 * with no related content is deleted rather than kept: an empty `relatedTo`
 * would otherwise silently turn it into a tour-owned question.
 */
export const detachDeletedContentFromQuestions: CollectionAfterDeleteHook = async ({ id, req }) => {
  const contentId = String(id)
  const { docs } = await req.payload.find({
    collection: 'quizQuestions',
    where: { relatedTo: { in: [contentId] } },
    depth: 0,
    limit: 0,
    pagination: false,
    select: { relatedTo: true },
    req,
  })
  for (const question of docs) {
    const remaining = ids(question.relatedTo as Ref[] | undefined).filter((c) => c !== contentId)
    if (remaining.length) {
      await req.payload.update({
        collection: 'quizQuestions',
        id: question.id,
        data: { relatedTo: remaining },
        req,
      })
    } else {
      await req.payload.delete({ collection: 'quizQuestions', id: question.id, req })
    }
  }
}

/**
 * QuizQuestions.afterDelete: remove the dangling ID from every quiz listing it,
 * otherwise those tours would fail relationship validation on their next save.
 */
export async function detachDeletedQuestionFromTours(req: PayloadRequest, questionId: ID) {
  const { docs } = await req.payload.find({
    collection: 'tours',
    where: { 'quiz.questions': { in: [questionId] } },
    depth: 0,
    limit: 0,
    pagination: false,
    select: { quiz: true },
    req,
  })
  for (const tour of docs) {
    await req.payload.update({
      collection: 'tours',
      id: tour.id,
      data: {
        quiz: { questions: tourQuizQuestionIds(tour).filter((q) => q !== questionId) },
      },
      req,
    })
  }
}
