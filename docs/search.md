# Search (Typesense)

Marketplace, navigator (home dropdown) and the `/search/{tours,contents,objects}`
pages read one Typesense collection. Payload is the source of truth: its
collection hooks write the index through the Next server (`src/lib/search/*`),
and every read goes through the Next server too. The browser never talks to
Typesense and no key ever has a `NEXT_PUBLIC_` prefix.

## Cluster and environment

| Variable                               | Meaning                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `TYPESENSE_HOST`, `TYPESENSE_API_KEY`  | The cluster (Typesense Cloud) and its admin key. Both required.          |
| `TYPESENSE_PORT`, `TYPESENSE_PROTOCOL` | Default `443` / `https` (Cloud); a self-hosted node can override them.   |
| `TYPESENSE_COLLECTION`                 | The collection name, default `artaround` (one per environment/database). |

**Locally and in CI** the same variables point at the compose `typesense`
node that `pnpm services:start` runs (Typesense 30.1, `127.0.0.1:8108`,
`http`, development key `xyz`, loopback only): `.env.example` and
`tests.yml` carry those values, so the search pages, the indexing hooks and
integration specs work without a Cloud cluster. A new local database is
indexed as it is seeded (the hooks write on save); an existing one needs
`pnpm search:reindex` once.

There is no fallback in code and no Payload fallback: the node is reached only
because the variables name it. Without the two
required variables, or with the cluster unreachable, reads throw
`SearchUnavailableError` and each surface shows its error state
(`SearchUnavailableAlert`, the dropdown's error line); writes are logged and
skipped, so a Payload save always succeeds. The production container must be
able to reach the cluster over HTTPS and carry the variables in its environment
or `.env.production` ([Standalone deploy](standalone-deploy.md)).

## What is indexed

One document per source document, `id` = `{kind}_{sourceId}`
(`buildSearchDocument()` in `src/lib/search/documents.ts`; the schema is
`src/lib/search/schema.ts`, the vocabulary `src/lib/search/types.ts`):

| Payload collection | `kind`    | Searched text                                   | Also                                  |
| ------------------ | --------- | ----------------------------------------------- | ------------------------------------- |
| `tours`            | `tour`    | title, museum name and city, works of its stops | price, duration, difficulty, subjects |
| `contents`         | `content` | title, works                                    | price, duration, difficulty, subjects |
| `objects`          | `object`  | name, artist, museum name and city              | public description                    |
| `museums`          | `museum`  | name, city, region                              |                                       |
| `users`            | `user`    | full name, username                             |                                       |

- Text is indexed in English (`locale: 'en'`) so matching stays stable; cards
  are hydrated from Payload in the visitor's locale (`src/lib/search/hydrate.ts`
  and the routes' own hydration), so titles, prices and images stay correct.
- A content body is never indexed, so a paid body can't leak through a match or
  a subtitle.
- `museum_id` lists every museum a document belongs to (museum mode is one
  `filter_by`); `author_id` and `subject_ids` back the scoped search pages
  (`?author=`, `?subject=`, `src/lib/search-scope.ts`).
- A tour counts only its visitable stops (`withVisitableStops`) for its price,
  duration and difficulty, as its card, page and checkout do.
- "Works" in tour and content rows: the names and artists of the works behind
  their stops, searched but never shown, so "Caravaggio" finds the tours and
  contents that show his works.

Every searchable text field has `infix: true`: `query.ts` sends
`infix: 'fallback'` (substring match when the prefix one found nothing), and
Typesense refuses that query without it. Change the schema and the query
together.

## Keeping the index in step

- `searchSyncAfterChange` / `searchSyncAfterDelete` (`src/lib/search/sync.ts`)
  on each indexed collection: one upsert or delete per save.
- Dependent rows: a museum's rename refreshes its tours and objects; a
  content's price or a work's name refreshes the tours that include it
  (`resyncToursIncluding`); a tour's visitable stops changing (map edit,
  deleted content: `src/lib/visitable-stops.ts`, `src/lib/tour-stop-cleanup.ts`)
  re-syncs those tours (`resyncSearchDocuments`).
- The collection is created on first use (`ensureSearchCollection`), so
  `pnpm seed` fills a fresh cluster.

## What is never listed

`isUnlistedInSearch()` is the one rule for the hooks and the reindex: private
contents and tours, the tours of one visitor (planned visits, visit copies:
`isPersonalTour`) and tours with no visitable stop (`isEmptyTour`,
`tours.visitableStops` is 0: see
[permissions](permissions-and-editing.md#visitable-stops-derived-server-written))
get no row; a document that becomes unlisted has its row deleted, and gets it
back when it is listed again. The same rules (`LISTED_TOURS`, a `where`, in
`src/lib/visibility.ts`) keep them out of every list of tours.

The museum navigation's actions ("Open next stop", "Nearest food", the
reading options) are client-side commands built from the navigation state
(`navigation-commands.ts`), not documents: the map's Spotlight searches them
beside the catalog, and they never enter the index.

## Result scopes

`searchItems()` (`src/lib/search/query.ts`) is the single read path: each
surface passes its kinds, fields (`queryBy`) and filters; ranking is relevance,
then `priority` (tours 10, contents 8, museums 6, objects 5, users 4), then
recency (browsing without a query: priority and recency only).

- **Marketplace** (`src/lib/marketplace.ts`): tours, contents, objects, users
  (people only with a text query); price filters on tours and contents.
- **Navigator** (`/api/navigator-search`): tours, contents and museums; in
  museum mode (`museumSearchMuseumId`) the locked museum's tours, contents and
  works instead. The route ranks a pool of 40 hits by exact city, title and
  partial city match before keeping `limit`, so an exact match is never cut by
  priority, then hydrates the rows (length, difficulty, stops, price,
  thumbnail, the museum's position for "near you").
- **Search pages** (`/search/{tours,contents,objects}`): one kind each, with
  the URL scopes of `src/lib/search-scope.ts`.

## Reindex

```bash
pnpm search:reindex
```

`src/scripts/search-reindex.ts` drops the collection and rebuilds every row
with the hooks' own projection. Needed after a schema or projection change, a
database restore (which fires no hooks), or to repair rows missed while the
cluster was unreachable. The standalone boot runs it at every start (bundled as
`standalone-reindex.mjs`), so a deploy always serves a fresh index; a failure
is logged and the app starts anyway.
