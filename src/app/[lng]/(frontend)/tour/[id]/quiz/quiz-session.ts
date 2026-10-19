import { useSyncExternalStore } from 'react'

/**
 * In-progress quiz state in `sessionStorage`, so a reload (or a language
 * switch) resumes at the same question with the same answers. Keys are the
 * opaque option keys: locale-independent and revealing nothing.
 *
 * Exposed as an external store (`useSyncExternalStore`): the server snapshot
 * is `null` ("not restored yet"), so hydration matches and the browser value
 * takes over without a setState-in-effect. When storage is unavailable
 * (private mode, blocked site data) an in-memory copy keeps the page working;
 * it just does not survive a reload.
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
const listeners = new Set<() => void>()
/** Last raw value and its parsed snapshot per tour: snapshots must be referentially stable. */
const snapshots = new Map<string, { raw: string | null; session: QuizSession }>()
const memory = new Map<string, string | null>()

function readRaw(tourId: string) {
  try {
    return window.sessionStorage.getItem(storageKey(tourId))
  } catch {
    return memory.get(tourId) ?? null
  }
}

function snapshot(tourId: string): QuizSession {
  const raw = readRaw(tourId)
  const cached = snapshots.get(tourId)
  if (cached && cached.raw === raw) return cached.session
  let session = emptyQuizSession()
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<QuizSession>) : null
    session = { choices: parsed?.choices ?? {}, feedback: parsed?.feedback ?? {} }
  } catch {
    // Corrupt entry: start over.
  }
  snapshots.set(tourId, { raw, session })
  return session
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Replaces (or with `null`, clears) a tour's saved quiz progress. */
export function saveQuizSession(tourId: string, session: QuizSession | null) {
  const raw = session ? JSON.stringify(session) : null
  try {
    if (raw === null) window.sessionStorage.removeItem(storageKey(tourId))
    else window.sessionStorage.setItem(storageKey(tourId), raw)
  } catch {
    memory.set(tourId, raw)
  }
  listeners.forEach((listener) => listener())
}

/** The saved session, or `null` during SSR/hydration before storage can be read. */
export function useQuizSession(tourId: string): QuizSession | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(tourId),
    () => null,
  )
}
