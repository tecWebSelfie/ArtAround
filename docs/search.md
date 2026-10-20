# Search (Payload plugin)

The site uses the official `@payloadcms/plugin-search` plugin. It keeps a
generated `search` collection in sync with the source documents; there is no
external search service.

## What is indexed

`searchPlugin()` in `src/payload.config.ts` indexes:

| Payload collection | Search kind | Searchable text                        | City        | Price |
| ------------------ | ----------- | -------------------------------------- | ----------- | ----- |
| `tours`            | `tour`      | title, museum name, museum city        | from museum | yes   |
| `contents`         | `content`   | title                                  | –           | yes   |
| `users`            | `user`      | full name, username                    | –           | –     |
| `museums`          | `museum`    | name, city, region                     | yes         | –     |
| `objects`          | `object`    | name, artist, museum name, museum city | from museum | –     |

Descriptions are deliberately excluded from the index for every collection:
`tours.description`, `contents.body` (rich text), `users.description`/`bio`,
`museums.shortDescription`/`description` (rich text) and `objects.description`.
Search hence matches titles and the metadata listed above only.

`src/lib/search-index.ts` owns the projection:

- `buildSearchDoc()` flattens relationship/location data into `title`, `excerpt`,
  `kind`, `city`, `priceCents` and `sourceCreatedAt`.
- The index is deliberately English-only (`localize: false`). Cards are hydrated
  from the original Payload documents in the visitor's locale, so translated
  titles, prices and images stay correct.
- The museum of a tour is `tours.museum`; the museum of an object is the one
  whose map places it (`museums.objects`, derived from the map — see
  docs/permissions-and-editing.md).
- `priceCents` follows the paid-content model: a content's `price`, and for a
  tour the sum of its contents' prices (its list price; a visitor who owns some
  of them pays less, see `src/lib/checkout-quote.ts`). Currency is EUR.
- Museum changes refresh the search rows of their tours/objects, because those
  rows embed the museum name and city. A content's price change refreshes the
  rows of the tours that include it (`refreshTourPrices` in `Contents`).

## Access

The `search` collection is server-side data. The plugin's defaults (public
`read`, update/delete for any signed-in user) are overridden to super-admin
only, so REST/GraphQL can't leak excerpts or let visitors rewrite rows (for
example raise a row's `priority`). All app reads go through
`querySearchIndex()` with `overrideAccess`, and the plugin syncs through the
Local API. No rich-text body or description is indexed, so a paid body can't
leak through a match or a subtitle.

## Result scopes

Both scopes read the same `search` collection through
`querySearchIndex()` (`src/lib/search-query.ts`):

- **Marketplace** (`src/lib/marketplace.ts`): `tours`, `contents`, `users`.
  Empty-query browsing and text searches use the same rows. Price filters apply
  to tours/contents; users are included in "All" only with a text query.
- **Navigator** (`/api/navigator-search`, the home dropdown): `tours`,
  `contents`, `museums` (`NAVIGATOR_SEARCH_KINDS`). Every result opens its
  detail page, whose CTA leads into the map (or to buying a locked content).
  - The query also matches museum city ("Roma" surfaces museums and tours in
    Rome).
  - Ordering: rows sort by `priority` (`SEARCH_PRIORITIES`: tours 10, contents
    8, museums 6, objects 5, users 4), then the route ranks a pool of
    `RANK_POOL` (40) rows by exact city, title and partial city match before
    keeping `limit`, so an exact match is never cut by priority.
  - Museum mode (`museumScope()`): only the locked museum, its tours and the
    contents on its map (`restrictTo` in `querySearchIndex()`).
  - Rows are hydrated in the visitor's locale with what the dropdown shows:
    minutes (a tour's `durationMinutes`, else its contents' reading time; at
    least 1), difficulty (a tour's hardest content), stops, and a paid
    content's price.

## Reindex

Normal creates/updates/deletes sync automatically. Rebuild the whole index after
enabling search, adding a collection, or changing `buildSearchDoc()` or
`SEARCH_PRIORITIES`:

```bash
pnpm search:reindex
```

The script clears the `search` collection and recreates one row per source
document. The plugin's admin **Reindex** button also works, but it iterates every
configured locale; the CLI script is the faster option for this project.

## Filtering

- `kind` is a select field (`tour`, `content`, `user`, `museum`, `object`).
- `priceCents` is `0` for free content/tours and for non-sellable rows; `paid`
  matches `> 0`.
- `city` is indexed and included in the text query.
- `sourceCreatedAt` preserves the source document's creation time for
  newest-first marketplace ordering.
