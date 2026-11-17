# On-demand AI translation (`src/plugins/autoTranslate.ts`)

Editorial content (museums, objects, contents + upload `alt`s) is machine-translated
lazily into any user locale and cached in Payload. Stack: `@focus-reactive/payload-plugin-translator`
**exact pin `0.13.4`** (no caret — its unpublished `/translate/stale/*` route is load-bearing,
see `src/endpoints/localized.ts` header) with Groq `openai/gpt-oss-120b` provider.

- Mark translatable leaves with `editorial()` (`src/fields/editorial.ts`) — single generic
  factory returning the field with `localized: true`. Opt-in only: new fields stay
  untranslated-but-safe until wrapped. Never wrap `slug`, identifiers, emails/URLs,
  or third-party plugin internals.
- Register collections in ONE place: `autoTranslatePlugin({ collections: [...] })` in
  `src/payload.config.ts`. The wrapper mounts `GET /api/{slug}/:id/localized?locale=xx`
  on each and delegates to the translator (provider, Jobs runner, `provenance: true`,
  no drafts). Never register `translatorPlugin` standalone alongside it.
- `GROQ_API_KEY` lives in `.env` / `.env.local` (server-only, never `NEXT_PUBLIC_`).
  Empty key boots fine; translations fail at runtime with a clear provider error.

## Frontend usage (for app developers)

Do NOT call Payload REST directly for localized reads (anonymous REST is RBAC-denied
and `fallback: true` silently masks missing translations). Use the collection endpoint:

```
GET /api/objects/:id/localized?locale=fr
→ { status: 'hit', source: 'db', locale, doc }                            // cached, ~100ms
→ { status: 'miss-queued', source: 'fallback-en', locale, doc, queued }   // paints NOW
→ { status: 'stale-refreshing', source: 'db-stale', ... }                 // serves stored + refreshes
→ { status: 'miss-throttled', ... } (429) / { error } (400/404)
```

`?locale=` is optional: omitted, the server falls back to the request's
`Accept-Language` header (explicit param always wins; present-but-invalid stays 400).

Pattern: render `doc` immediately (EN fallback on MISS), show a badge while
`status` is `miss-*`/`stale-refreshing`, poll the SAME url every 2s (max ~15) until
`hit`. Next visitors get HIT instantly, zero AI. Never write translation logic in
`afterRead` hooks and never import `dist/client` widget code into the frontend —
reuse the endpoint. Playground: `/test-translation?collection=objects&id=…&locale=ja`.

Typed DX (no `any`, no raw fetch): server code uses `resolveLocalized(payload, origin, …)`
from `src/lib/localized.ts` (pure Local-API reads, same contract the endpoint serves);
browser/client code uses `getLocalizedDoc()` from `src/payload-sdk.ts`
(`PayloadSDK<Config>` + typed `doc` per collection). The endpoint itself
(`src/endpoints/localized.ts`) is only the thin HTTP shell (validation, throttle,
status codes) over `resolveLocalized()`.

Server pages never go through that endpoint, so they queue the translation
themselves: `requestTranslations(payload, collection, ids, locale)` in
`src/lib/localized.ts` (once per document and window; `requestTourTranslations`
for a tour with its stops and quiz) returns whether anything is
still on its English fallback, and the page then renders `TranslationPending`
(`src/components/TranslationPending.tsx`, or `TranslationNotice` for the documents
read with `getLocalizedPageDocument`), which refreshes the route until the text
arrives. The queue runs one document every 10 s on purpose (the provider's
tokens-per-minute are shared with the live AI features; `TRANSLATION_JOBS_PER_RUN`
raises it where the quota allows, e.g. for a bulk translation from the admin); `{ urgent: true }` runs
the job at once and is for the one text the visitor is reading. The translator's
prompt names the target language in full (`languageName` in
`src/plugins/autoTranslate.ts`): with the bare code, "into it" was read as a
pronoun and other languages were stored under the Italian locale.

Caveats: in-memory per-IP throttle (30 enqueue/min, per-instance — Redis in prod);
`stale` freshness check fail-opens to HIT if the pinned internal route ever 404s.
