import { createSessionStore } from '@/lib/session-store'

/**
 * In-progress quiz state in `sessionStorage`, so a reload (or a language
 * switch) resumes at the same question with the same answers. Keys are the
 * opaque option keys: locale-independent and revealing nothing.
 *
 * Stored through `createSessionStore` (`src/lib/session-store.ts`): `null`
 * until hydration, then the browser value; an in-memory copy when storage is
 * blocked.
 */

export type QuizFeedback = { correct: boolean; correctKey: string; explanation: string | null }

export type QuizSession = {
  /** Chosen option key per question ID. */
  choices: Record<string, string>
  /** Server feedback per answered question, replayed after a reload. */
  feedback: Record<string, QuizFeedback>
}

export const emptyQuizSession = (): QuizSession => ({ choices: {}, feedback: {} })

const storageKey = (tourId: string) => `artaround:quiz:${tourId}`

const store = createSessionStore<QuizSession>((stored) => {
  const parsed = stored as Partial<QuizSession> | null
  return { choices: parsed?.choices ?? {}, feedback: parsed?.feedback ?? {} }
})

/** Replaces (or with `null`, clears) a tour's saved quiz progress. */
export function saveQuizSession(tourId: string, session: QuizSession | null) {
  store.save(storageKey(tourId), session)
}

/** The saved session, or `null` during SSR/hydration before storage can be read. */
export function useQuizSession(tourId: string): QuizSession | null {
  return store.useValue(storageKey(tourId))
}
