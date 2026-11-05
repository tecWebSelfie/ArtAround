# Subjects and Wikidata

Universal identifiers for works, artists, styles and events (course
requirement; `docs/plan/requisiti-18-33.md`, point 5).

## Data model

- `objects.wikidataId`: the work's Wikidata item (e.g. `Q1103801`), the
  universal identifier beside the Payload id. `objects.inventoryNumber` is the
  museum's own number, local to it.
- `subjects` (`src/collections/Subjects.ts`): what a work relates to without
  being on the map: `kind` person, movement (style) or event, localized
  `name`/`description`, optional `wikidataId`, and `contents` about it.
  Kept apart from `objects` on purpose: map, navigation and QR codes only ever
  meet physical works.
- Works link to subjects through `objects.creators`, `movements`, `events`
  (each filtered to its kind). Contents about a subject are read back on the
  content as the `subjects` join.
- Uniqueness of `wikidataId` per collection is a hook (`uniqueWikidataId`,
  `src/fields/wikidataId.ts`), not an index: most documents have no Q-id.
- Only the Q-id is stored, no other identifiers (ULAN, AAT, VIAF): they stay
  one Wikidata request away.

## Import

- Setting or changing a work's `wikidataId` queues `importWikidataSubjects`
  (queue `wikidata`, every 10 s). It reads the work's author (P170), movement
  (P135) and significant events (P793), one level only, reuses subjects with
  the same Q-id and creates the others with their names and descriptions in
  every app language Wikidata has (the translator fills the rest).
- A merged item: Wikidata follows the redirect and the work stores the current
  id.
- `src/lib/wikidata.ts` is the client (`wbsearchentities`, `wbgetentities`),
  with retries on rate limits (429/503, `Retry-After`).
- `pnpm seed:demo` runs the import right away for the Pinacoteca's works.

## UI

- Object form (`ObjectMetadataForm`): "Wikidata" (`WikidataInput`, search by
  name in the page's language or type a Q-id) and "Inventory number".
- Object details show the author as a link and the movement as a badge, both to
  `/[lng]/subject/[id]` (description, contents about it, works linked to it,
  link to Wikidata). Pages load the subjects (`subjectsOfWork`,
  `src/lib/subjects.ts`) and pass them to `ObjectDetailsContent`, which stays
  free of database reads so its stories render.

- Contents about a subject instead of a work: `/content/new` lets authors
  choose "An artist, style or event" (`SubjectPicker`), and a subject page
  offers "Write a content about it" (`?subject=`). The create call passes the
  virtual `attachToSubject`, and the server links the content in
  `subjects.contents` (authors can't edit subjects themselves). The subject
  page reads its contents as the visitor, so private ones stay hidden.

Tests: `tests/int/wikidata-subjects.int.spec.ts` (recorded Wikidata answers),
story `ObjectDetailsModal` → With Subjects.
