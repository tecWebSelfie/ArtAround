# Quiz rework: design draft

Status: draft for review (2026-11-17). Replaces the `quizQuestions` collection
with questions stored inside the document they belong to. Current design:
[tour quiz](../tour-quiz.md).

## Why

Today a question is its own document (`quizQuestions`) and a tour lists
question ids. Keeping tours, contents and questions in step takes ownership
validation, cleanup hooks on three collections, a picker filter and a
multi-request save with a client-side rollback (`saveQuizQuestions`). MongoDB
in production is standalone, so Payload runs **without transactions**
(`@payloadcms/db-mongodb` disables them without a replica set): any of those
multi-document writes can stop halfway. A single document write is atomic, so
questions that live inside their owner are consistent by construction.

## Product rules

1. A quiz belongs to exactly one tour.
2. A question is about one content, or about the tour as a whole. (Questions
   about several contents become tour questions.)
3. Questions and answers are secret until the quiz is taken. Only the people
   who may edit the owning document (its author, museum moderators, super
   admins) read them, in its editor. Everyone else sees only a badge ("has a
   quiz", question count) on cards and detail pages.
4. The tour's author picks which content questions enter the quiz and in what
   order, mixed with the tour's own questions. A group host takes the quiz as
   composed; nobody is forced through every question of a stop.
5. A copy of a tour (customize or visit copy) starts with only what the
   copying user is entitled to.

## Data model

### `question` field (`src/fields/quiz-question.ts`)

Array row factory shared by contents and tours. The row `id` (Payload's
ObjectId string, stable across edits) is the question's identity.

| Field           | Type                    | Notes                                   |
| --------------- | ----------------------- | --------------------------------------- |
| `prompt`        | textarea, `editorial()` | required                                |
| `image`         | upload `contentImages`  | optional                                |
| `correctAnswer` | text, `editorial()`     | required                                |
| `wrongAnswers`  | array of `{ text }`     | exactly 3 rows; `text` is `editorial()` |
| `explanation`   | textarea, `editorial()` | optional                                |
| `difficulty`    | select                  | default `medium`                        |

### Contents

- `quizQuestions`: array of `question`. Field access: read, create and update
  only for editors of the content (the same rule as `Contents.update`).
- `quizQuestionCount`: number, readable by anyone, set in `beforeChange` from
  the array. Drives the badge.

### Tours

- `quiz.ownQuestions`: array of `question` (the tour's own questions). Field
  access: editors of the tour.
- `quiz.items`: ordered array `{ content?: relationship contents, question:
text }`, the quiz as the author composed it. `content` empty means
  `question` is a row of `quiz.ownQuestions`; otherwise a row of that
  content's `quizQuestions`. Field access: editors of the tour.
- `quiz.questionCount`: number, readable by anyone, the badge.

### Quiz attempts

- `answers[].question` and `correctQuestions` become **text** (the question's
  row id) instead of relationships to `quizQuestions`. Indexed for the
  statistics counts.
- `answers[].content`: the content the question was about (empty for a tour
  question), for "read the content again".

A question deleted after an attempt leaves its id in the attempt. That is
harmless by design: the result page already renders a missing question as
removed (`missing: true` in `quiz/result/[token]/page.tsx`), the score and
total are stored on the attempt, and the per-question rate is simply not
shown for it. (The same happens today when a question document is deleted.)

## Composition (no sync hooks)

The quiz is resolved **when it is read** (`src/lib/quiz.server.ts`): walk
`quiz.items` in order and keep an item only if

- it is a tour item and its row exists in `quiz.ownQuestions`, or
- its content is one of the tour's visitable stops and the row still exists
  in that content's `quizQuestions`.

Everything else is skipped silently. Removing a stop, deleting a content or
deleting a question therefore needs no cleanup hook on other documents. On
the tour's next save, a `beforeValidate` hook drops the stale items, so the
stored list converges; correctness never depends on it.

## Keeping answers secret

The guard sits **upstream, in the schema**, not in each read:

- Field-level `access.read` on `Contents.quizQuestions`, `Tours.quiz.ownQuestions`
  and `Tours.quiz.items`. Payload applies it to REST, GraphQL, the admin UI,
  the MCP plugin and every Local API read with `overrideAccess: false`.
  Visitor pages read through `asViewer()` (`src/lib/session.ts`), and
  `/api/{slug}/:id/localized` reads with `req.user` and access on
  (`src/lib/localized.ts`), so all of them drop the fields for non-editors.
- `select` is **not** the guard. It is opt-in per call: one read that forgets
  it would leak. It stays as defence in depth and to keep payloads small on
  the reads that must use `overrideAccess` (system reads, the quiz flow).
- The quiz flow keeps today's pattern: server-only reads with
  `overrideAccess` and a `select` of the quiz fields, then only
  `quizQuestionViews()` (prompt and shuffled options with HMAC keys, no
  answer) reach the browser; grading happens on the server.
- Reads with `overrideAccess` that return whole tours or contents must not
  reach the browser. Today they all use `select` or map fields (checked:
  `search/documents.ts`, `navigator-search`, `visitable-stops.ts`,
  `marketplace.ts`, `navigation-tour.server.ts`); the search projection maps
  explicit fields, so the index never sees the arrays.
- The `autoTranslatePlugin` `serverOnly: [QuizQuestions]` case goes away:
  the translator runs server-side, and `/localized` drops the fields through
  access.
- Tests (integration, against Payload): REST `GET /api/tours/:id` and
  `/api/contents/:id` as anonymous, another user and the author; `/localized`
  for the same three; the search document of a tour and a content; a tour
  passed to a client component (the navigation tour) has no question fields.

## Editing

- **Content form**: the existing `QuizEditor` edits `quizQuestions`; the
  content is saved in one request (atomic).
- **Tour form**: `QuizEditor` edits `quiz.ownQuestions`, and a list builds
  `quiz.items`: the author adds own questions or picks content questions of
  the current stops, and reorders. One request saves the tour (atomic). The
  multi-request save, `keptQuestions` and the client rollback go away.
- Picking content questions needs their prompts: see open question 1.

## Copies

`/tour/new?from=<id>` (customize or visit copy, `src/lib/tour-copy.ts`):

- Content items are kept for the stops the copy keeps (`copyableStops`).
  They are references, so no answer is exposed, and the content's questions
  stay with their author.
- The tour's own questions are copied only if the copying user may read them
  (copying one's own tour, a super admin). Otherwise they are dropped, with
  their items.

## Migration (run by the boot script)

Production can't run the Payload CLI: the migration is a bundled script that
`scripts/standalone-boot.mjs` runs after the seed, idempotent (it reads the
old collection straight from MongoDB and marks itself done).

1. `quizQuestions` with one content in `relatedTo` → a row of that content's
   `quizQuestions`, **keeping the document id as the row id**.
2. With no content → a row of `quiz.ownQuestions` of the tour listing it,
   id kept.
3. With several contents → a tour question in each tour that lists it; the
   first keeps the id, the others get new ones.
4. Each tour's `quiz.items` is rebuilt from its old `quiz.questions` order.
5. Attempts: relationship values are already id strings, so they stay as
   text; `answers[].content` is filled from the question's content.
6. Counts are computed; the old collection is dropped once everything moved.

Keeping the ids keeps every stored attempt, result page and statistic valid.
The demo seed (`scripts/seed-demo-museum.ts`, 4 questions) and the e2e seed
write the new fields directly.

## What goes away

`src/collections/QuizQuestions.ts`, most of `src/lib/quiz-ownership.ts`
(picker filter, ownership validation, deletion and detach hooks), the quiz
part of `src/lib/tour-stop-cleanup.ts`, `saveQuizQuestions` and its rollback,
`getTourQuizDrafts`' kept questions, the admin "+" drawer flow.

## Phases

1. `question` field, new fields on contents and tours, field access, the
   secrecy tests (red first, then green).
2. Read-time composition in `quiz.server.ts`; attempts on text ids; result
   page and statistics.
3. Content form and tour form editors; badges on cards and detail pages
   (Impeccable `shape` first).
4. Copies.
5. Migration script, boot step, seeds; remove the old collection and hooks;
   update `tour-quiz.md`, `permissions-and-editing.md`, `group-tours.md`.

## Open questions

1. **Prompts for the tour author.** To pick a content question, the tour's
   author must see at least its prompt, but rule 3 hides questions from
   anyone who can't edit the content. Options:
   a. the tour editor shows the **prompt only** (never the answers) of the
   questions of contents the author can read and has as stops;
   b. no picking: a stop contributes all its questions or none (contradicts
   rule 4);
   c. only the content's author can add its questions to tours.
   Recommended: (a). Prompts without answers spoil little, and only to
   someone composing a tour.
2. **Paid contents.** Does a visitor who hasn't bought a paid content get its
   questions in the quiz? Today they do (questions follow visitable stops).
3. **Questions about several contents.** Fine as tour questions only?
