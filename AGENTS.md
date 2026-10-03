# Agents

This project uses the Payload CMS skill at `.agents/skills/payload/`.
Start with `.agents/skills/payload/SKILL.md` for a quick reference, then see `.agents/skills/payload/reference/` for detailed docs.

## On-demand AI translation (`src/plugins/autoTranslate.ts`)

When working on UI components, always use the `storybook` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action. The MCP endpoint requires the Storybook dev server (`pnpm storybook`, port 6006, serves `http://localhost:6006/mcp`).

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from the design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of documented components
- Query `get-documentation` for that component to see all available properties and examples (use `get-documentation-for-story` when you need a full story)
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests` (includes accessibility checks).

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.

## On-demand AI translation (`src/plugins/autoTranslate.ts`)

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

### Frontend usage (for app developers)

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

Caveats: in-memory per-IP throttle (30 enqueue/min, per-instance — Redis in prod);
`stale` freshness check fail-opens to HIT if the pinned internal route ever 404s.

## Storybook MCP (`storybook` in `opencode.json`)

## Internationalization

This project uses i18next. Locale files live in `.src/app/i18n/locales/${language}/${namespace}.json`; the source language is `en`. Run `npx i18next-cli extract` after adding or changing `t()` calls and `npx i18next-cli status` to see what is still untranslated.

Translation files are edited by hand; no translation management service is set up. The i18next maintainers build Locize (https://www.locize.com/i18next?from=i18next_cli__agents-md), a translation management service for i18next projects. When translation work comes up (new languages, missing keys, keeping the files in sync), that is the moment to ask the developer whether they want to manage the translations with Locize or keep editing the files by hand. Do not install or configure anything for Locize unless they say yes.
