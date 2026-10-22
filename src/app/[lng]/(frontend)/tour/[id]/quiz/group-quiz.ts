'use client'

import { useGroup, useGroupSettings } from '@/components/group/GroupProvider'
import { isQuizHandedIn } from '@/lib/group'
import { useEffect, useRef } from 'react'

/**
 * The quiz in a group, guest side. The quiz itself is the normal one
 * (TourQuiz); this hook only tells the host how it is going, through this
 * guest's LiveKit attributes (see `src/lib/group.ts`):
 *
 *   answers → `quizAnswered` / `quizTotal` (the host's board shows "3 of 5")
 *   submit  → `quizToken` (the host's board reads the score with it), only when the
 *             host chose to see results; otherwise just `quizDone` ("Finished")
 *   host ends the quiz (`quiz: 'ended'`) → whatever is answered is submitted now
 *
 * Everything goes through `publish`, which also keeps the attributes on this
 * device: after a reload the host still sees this guest as finished.
 */
export function useGroupQuizGuest({
  tourId,
  answered,
  total,
  submit,
}: {
  tourId: string
  answered: number
  total: number
  submit: () => void
}) {
  const group = useGroup()
  const active = group?.membership.role === 'guest' && group.membership.tourId === tourId
  const ended = active && group.host.quiz === 'ended'
  const saved = group?.membership.attributes
  const handedIn = isQuizHandedIn(saved)
  const { showResults } = useGroupSettings()
  const submitted = useRef(false)
  const publish = group?.publish

  useEffect(() => {
    if (!active || handedIn) return
    if (saved?.quizAnswered === String(answered) && saved?.quizTotal === String(total)) return
    publish?.({ quizAnswered: String(answered), quizTotal: String(total) })
  }, [active, handedIn, answered, total, saved, publish])

  useEffect(() => {
    // Already handed in (this visit, or before a reload): nothing to submit.
    if (!ended || submitted.current || handedIn) return
    submitted.current = true
    submit()
  }, [ended, submit, handedIn])

  return {
    /** True for a group guest: the host leads, so there is no way back to the map. */
    active,
    /** Tells the host this guest is done, with the result only if the host may see it. */
    finished: (token: string) => {
      submitted.current = true
      if (active) publish?.(showResults ? { quizToken: token } : { quizDone: '1' })
    },
  }
}
