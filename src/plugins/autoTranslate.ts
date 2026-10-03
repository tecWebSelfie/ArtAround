import type { CollectionConfig, Config } from 'payload'
import OpenAI from 'openai'
import {
  collectionLevel,
  createPayloadJobsRunner,
  createTranslationProvider,
  documentLevel,
  openAIComplete,
  translatorPlugin,
} from '@focus-reactive/payload-plugin-translator'
import { localizedReadEndpoint } from '@/endpoints/localized'
import type { LocalizedSlug } from '@/lib/localized'

/**
 * Demo wrapper around `@focus-reactive/payload-plugin-translator` (exact pin
 * `0.13.4` in package.json — internal routes below are frozen by that pin).
 *
 * You only pass the collections you want translated. The wrapper:
 * 1. mounts `GET /api/{slug}/:id/localized?locale=xx` on each of them
 *    (read path with receipt + staleness check, see `src/endpoints/localized.ts`),
 * 2. delegates to `translatorPlugin` with the same original collection objects
 *    (it snapshots `localized: true` on nested leaves before Payload's
 *    sanitizer strips them, so originals — not copies — must be passed).
 *
 * Editorial curation stays opt-in at field level: `editorial()` in
 * `src/fields/editorial.ts` sets the real `localized: true` flag. New fields
 * are untranslated-but-safe until wrapped; nothing is ever localized by accident.
 */
export function autoTranslatePlugin({
  collections,
}: {
  collections: CollectionConfig[]
}): (config: Config) => Promise<Config> {
  return async (incoming: Config): Promise<Config> => {
    const wanted = new Set(collections.map((c) => c.slug))
    const missing = [...wanted].filter(
      (slug) => !(incoming.collections ?? []).some((c) => c.slug === slug),
    )
    if (missing.length > 0) {
      throw new Error(`[autoTranslate] collections not found in config: ${missing.join(', ')}`)
    }

    const next: Config = {
      ...incoming,
      collections: (incoming.collections ?? []).map((col) =>
        wanted.has(col.slug)
          ? {
              ...col,
              endpoints: [
                ...(Array.isArray(col.endpoints) ? col.endpoints : []),
                localizedReadEndpoint(col.slug as LocalizedSlug),
              ],
            }
          : col,
      ),
    }

    return translatorPlugin({
      collections,
      translationProvider: createTranslationProvider({
        complete: openAIComplete({
          // Groq exposes an OpenAI-compatible Chat Completions API.
          // Put YOUR key in `.env` / `.env.local` as GROQ_API_KEY (server-only,
          // never NEXT_PUBLIC_). Empty string boots fine; translation fails at
          // runtime with a clear provider error until you set it.
          client: new OpenAI({
            baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY || '',
          }),
          model: 'openai/gpt-oss-120b',
          sampling: { temperature: 0 },
          // json_schema has per-model property ceilings; json_object is safer
          // for large museum docs on this model family.
          structuredOutput: 'json_object',
        }),
        systemPrompt: ({ defaultPrompt }) =>
          `${defaultPrompt}\nFormal museum register. Leave proper names, artwork titles and brand names untranslated.`,
        capabilities: { inlineMarks: true },
      }),
      // Background Payload Jobs queue `translations` (async runner — pages never
      // block on AI; the frontend polls until HIT).
      runner: createPayloadJobsRunner(),
      levels: [documentLevel(), collectionLevel()],
      // Per-locale translation receipts (`translator-provenance` sidecar).
      // No migration needed on MongoDB.
      provenance: true,
      targetSelection: 'single',
      // Demo: public enqueue so unauthenticated app users trigger on-demand
      // translation of the single requested locale. The /:id/localized endpoint
      // gates (allowlist-by-mount, ISO validation, per-IP throttle); tighten
      // `access` once that gate is no longer enough.
      // access: { check: ({ req }) => Boolean(req.user) },
      experimental: { inlineMarks: true },
    })(next)
  }
}
