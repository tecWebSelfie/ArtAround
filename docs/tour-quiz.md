# Tour quiz: design and implementation status

Last reviewed: 2026-10-19. A tour may end with an optional multiple-choice quiz.
This document records the agreed design; sections marked *planned* are not
implemented yet. Related: [tour navigation](tour-navigation.md).

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

## Visitor flow (planned)

- Last stop's action becomes "Complete and go to quiz" → `/[lng]/tour/[id]/quiz`
  (outside the map layout). The tour cursor keeps its meaning; the quiz is not a step.
- `TourProgress` shows a final "Quiz" step; the quiz can be started early with a
  warning about unvisited stops. The completed-tour footer also offers it.
- `/quiz` intro (question count, early-quiz warning) → `/quiz?q=n`, one question per
  screen, no skipping. Choices persist in `sessionStorage` for reloads.
- Options are shuffled server-side and identified by opaque HMAC keys
  (`PAYLOAD_SECRET`, `server-only` module). A server action `checkAnswer` returns
  correctness + explanation after each answer (answers are final). `submitQuiz`
  re-grades everything from the database, stores the attempt (`answer` = `'correct'`
  or the wrong row ID) and redirects to `/quiz/result/[token]`.

## Results (planned)

Score with `RingProgress`; "better than X% of visitors" plus a `@mantine/charts`
score distribution in percentage bands (quizzes change over time); per-question
"% answered correctly" (counted on `correctQuestions`). Comparisons appear from
10 attempts on; all attempts count, anonymous included. Actions: rate tour, retake,
share (`navigator.share`), **Back to navigator** (`/[lng]/navigator`, primary).
