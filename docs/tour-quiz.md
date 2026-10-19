# Tour quiz: design and implementation status

Last reviewed: 2026-10-19. A tour may end with an optional multiple-choice quiz.
This document records the agreed design and where it lives in the code.
Related: [tour navigation](tour-navigation.md).

## Data model (implemented)

| Piece | Where | Notes |
| --- | --- | --- |
| Quiz | `Tours.quiz.questions` (named "Quiz" tab) | Ordered relationship to `quizQuestions`. Empty = no quiz. One quiz per tour by construction. |
| Question | `src/collections/QuizQuestions.ts` | `prompt`, optional `image` (`contentImages`), `correctAnswer`, `wrongAnswers` (exactly 3 rows), `explanation`, `difficulty`, `relatedTo`. |
| Attempt | `src/collections/QuizAttempts.ts` | Server-graded run; addressed by random `token`, never by `id`. |
| Ownership rules | `src/lib/quiz-ownership.ts` | Picker filter, validation, cleanup hooks. |

Authoring happens in the Payload admin. The Quiz tab picker uses `filterOptions`
over the form `data`, so it already lists questions about contents added but not
saved yet.

### Ownership

- `relatedTo` (contents, `hasMany`) set: the question concerns those contents and
  is reusable by any tour containing one of them (comparison questions link several).
- `relatedTo` empty: the question belongs to the single tour whose quiz lists it.
  Created from the Quiz tab's "+" drawer, it works even before the tour's first save.

Invariants enforced by hooks and validation:

- A content question in a quiz must concern at least one content still in the tour.
- A tour-owned question cannot be added to a second tour (the picker never lists it;
  validation rejects API attempts).
- Removing a tour-owned question from its quiz, or deleting the tour, deletes it.
- Deleting a content unlinks it; a question left with no content is deleted (an
  empty `relatedTo` would otherwise silently make it tour-owned).
- Deleting a question removes it from every quiz.

### Answers never reach the browser before answering

- `quizQuestions` reads need the staff `Content` RBAC permission (shared with
  contents: whoever edits contents edits their questions).
- `Tours.quiz.questions` and the attempt question relationships have `maxDepth: 0`:
  tour documents are passed to client components, and a populated question would
  carry `correctAnswer`.
- `autoTranslatePlugin({ serverOnly: [QuizQuestions] })` translates questions but
  mounts no public `/localized` read (it bypasses access and returns whole docs).
  The translator's field route, which returns field content, is not mounted
  (`fieldLevel()` is not enabled).
- `wrongAnswers` is not localized, only its `text` leaves: row IDs are shared by
  all locales, so grading by ID is language-independent.

## Visitor flow (implemented)

| Route / file | Role |
| --- | --- |
| `tour/[id]/quiz/page.tsx` | Server: reads the quiz, sends only `quizQuestionViews()` (reduced, shuffled) to the client. |
| `quiz/TourQuiz.tsx` | Intro (`/quiz`) and one question per screen (`/quiz?q=n`), feedback, submit. |
| `quiz/actions.ts` | Server Functions `checkQuizAnswer` (feedback) and `submitQuizAttempt` (re-grade, store, expire stats). |
| `quiz/quiz-session.ts` | `sessionStorage` store (`useSyncExternalStore`) so reloads resume. |
| `quiz/QuizContentDrawer.tsx` | "Read the content again" without leaving the page. |
| `quiz/result/[token]/` | Result page and `QuizResult` client view. |
| `src/lib/quiz-core.ts` | Pure logic: HMAC option keys, shuffle, grading, score bands (unit-tested). |
| `src/lib/quiz.server.ts` | `server-only`: localized question reads, secret binding, cached statistics. |

- Entry points: the last stop's action ("Complete and go to the quiz", `StepModal`
  `quizFrom`), the final "Quiz" step of `TourProgress` (selectable any time: early
  quiz), and "Take the quiz" in the completed-tour footer. All use `tourQuizPath()`,
  which carries `at`/`mobility`, drops `to` and adds `from` (the cursor left). The
  tour cursor keeps its meaning; the quiz is not a step.
- Quiz pages live outside the map layout. "Back to the map" returns to
  `/navigation/{from}` with the same position.
- `?q=` changes use `history.pushState` (no server render); a URL past the first
  unanswered question is clamped. Answers are final; no skipping.
- Options carry opaque HMAC keys (`PAYLOAD_SECRET`), stable per answer, so saved
  choices survive reloads and language switches. `checkQuizAnswer` reveals the correct
  key and explanation after an answer (a determined user could script it to peek;
  accepted for a learning quiz). `submitQuizAttempt` never trusts the client: it
  re-reads the tour's questions and re-grades. Stored `answer` is `'correct'`, a wrong
  row ID or `'unanswered'`.
- Questions are read with `resolveLocalized()`; a missing translation shows English
  and is enqueued after the response (`after()`).

## Results (implemented)

`/[lng]/tour/[id]/quiz/result/[token]`: score (`RingProgress`), verdict, comparison
("better than X%" + `@mantine/charts` `BarChart` of percentage bands, own band in
orange and labelled "(you)"), per-answer review (your/right answer, explanation,
"% of visitors got this right", read-again or "stop not visited yet" link), tour
rating (`LfrsRating`; anonymous visitors see "Sign in to rate"), Share
(`navigator.share`, clipboard fallback), Retake, and **Back to the navigator** in the
footer.

Statistics (`getQuizStats`) are plain indexed `count`s, cached per tour with
`unstable_cache` and expired by `updateTag()` on each submit. Comparisons need
`MIN_ATTEMPTS_FOR_STATS` (10) attempts; every attempt counts, anonymous included.
The per-question rate divides by the attempts that included that question.

## Verification status

- Unit: `tests/int/quiz-core.int.spec.ts`, `quiz-ownership.int.spec.ts`,
  `tour-navigation.int.spec.ts` (quiz paths).
- Storybook: `QuizResult.stories.tsx`, `StepModal.stories.tsx` (`LastStepWithQuiz`).
  In containers whose Playwright browser revision differs, point the Vitest browser
  provider at an installed Chromium (`launchOptions.executablePath`).
- Not yet verified against a running app and database: admin picker, validation and
  hooks, Server Functions, translation enqueue, cache expiry. `TourQuiz` has no story
  because it imports Server Functions; cover it with an e2e test on the seeded fixture.
