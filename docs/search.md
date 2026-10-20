# Search (Payload plugin)

The site uses the official `@payloadcms/plugin-search` plugin. It keeps a
generated `search` collection in sync with the source documents; there is no
external search service.

## What is indexed

`searchPlugin()` in `src/payload.config.ts` indexes:

| Payload collection | Search kind | Searchable text                                      | City        | Price |
| ------------------ | ----------- | ---------------------------------------------------- | ----------- | ----- |
| `tours`            | `tour`      | title, description, museum name, museum city         | from museum | yes   |
| `contents`         | `content`   | title, rich-text body                                | –           | yes   |
| `users`            | `user`      | full name, username, description, bio                | –           | –     |
| `museums`          | `museum`    | name, short description, rich-text description, city | yes         | –     |
| `objects`          | `object`    | name, artist, description, museum name, museum city  | from museum | –     |

`src/lib/search-index.ts` owns the projection:

- `buildSearchDoc()` flattens localized/rich-text/relationship data into
  `title`, `excerpt`, `kind`, `city`, `priceCents` and `sourceCreatedAt`.
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

## Result scopes

Both scopes read the same `search` collection through
`querySearchIndex()` (`src/lib/search-query.ts`):

- **Marketplace** (`src/lib/marketplace.ts`): `tours`, `contents`, `users`.
  Empty-query browsing and text searches use the same rows. Price filters apply
  to tours/contents; users are included in "All" only with a text query.
- **Navigator** (`/api/navigator-search`): `museums`, `objects`, `tours`, `users`.
  The query also matches museum city, so typing "Roma" surfaces museums and
  related tours/objects in Rome. The navigator dropdown shows the city as
  metadata and links to the canonical localized page.

## Reindex

Normal creates/updates/deletes sync automatically. Rebuild the whole index after
enabling search, adding a collection, or changing `buildSearchDoc()`:

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
