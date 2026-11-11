import type { CollectionConfig, Config } from 'payload'
import { TEXT_MODEL } from '@/lib/ai-models'
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
import { languageName, type LocalizedSlug } from '@/lib/localized'

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
  collections: publicCollections,
  serverOnly = [],
}: {
  collections: CollectionConfig[]
  /**
   * Translated like `collections`, but WITHOUT the public
   * `GET /api/{slug}/:id/localized` read: that endpoint reads through the Local
   * API (access bypassed) and returns the whole document, so collections with
   * secret fields (quiz answers) are read server-side with `resolveLocalized()`
   * only. The translator's own routes return no document content: the one that
   * would (`POST /translate/field`) is mounted only by `fieldLevel()`, which is
   * deliberately not in `levels` below — keep it that way.
   */
  serverOnly?: CollectionConfig[]
}): (config: Config) => Promise<Config> {
  const collections = [...publicCollections, ...serverOnly]
  return async (incoming: Config): Promise<Config> => {
    const wanted = new Set(collections.map((c) => c.slug))
    const withEndpoint = new Set(publicCollections.map((c) => c.slug))
    const missing = [...wanted].filter(
      (slug) => !(incoming.collections ?? []).some((c) => c.slug === slug),
    )
    if (missing.length > 0) {
      throw new Error(`[autoTranslate] collections not found in config: ${missing.join(', ')}`)
    }

    const next: Config = {
      ...incoming,
      collections: (incoming.collections ?? []).map((col) =>
        withEndpoint.has(col.slug)
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
          // The same model as the AI routes (src/lib/ai-models.ts).
          model: TEXT_MODEL,
          sampling: { temperature: 0 },
          // json_schema has per-model property ceilings; json_object is safer
          // for large museum docs on this model family.
          structuredOutput: 'json_object',
        }),
        // The plugin's default prompt names languages by ISO code only
        // ("from en into it"): the model read "into it" as a pronoun and
        // stored French, or the untouched English, under the Italian locale.
        // The target is therefore spelled out by name and repeated as a rule.
        // Artwork titles are translated too (a visitor expects the title
        // used in their language); only names of people and brands stay.
        systemPrompt: ({ defaultPrompt, sourceLang, targetLang }) =>
          [
            defaultPrompt,
            `The source language is ${languageName(sourceLang)}. The target language is ${languageName(targetLang)} (ISO 639-1 code "${targetLang}"): write every translated value in ${languageName(targetLang)}, never in any other language, and never leave a sentence or a title untranslated.`,
            'Formal museum register. Use the customary title of each artwork in the target language. Leave names of people and brand names as they are.',
          ].join('\n'),
        capabilities: { inlineMarks: true },
      }),
      // Background Payload Jobs queue `translations` (async runner — pages never
      // block on AI; the frontend polls until HIT). One document every 10 s:
      // a slow, steady background pace that leaves the provider's
      // tokens-per-minute to what visitors ask for live (the runner's default,
      // 50 documents at once every minute, exhausted it and made "Shorter" and
      // the voice assistant fail). The text a visitor is reading does not wait
      // for this schedule: `requestTranslations(..., { urgent: true })` runs
      // its job at once (src/lib/localized.ts).
      // `TRANSLATION_JOBS_PER_RUN` raises the pace where the provider's quota
      // allows it (a paid tier, or a bulk "translate all" from the admin
      // panel, which at one per run takes about 50 minutes for 300 documents).
      runner: createPayloadJobsRunner({
        autoRun: {
          cron: '*/10 * * * * *',
          limit: Math.max(1, Number(process.env.TRANSLATION_JOBS_PER_RUN) || 1),
        },
      }),
      // No fieldLevel(): its POST /translate/field returns field content (see `serverOnly`).
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
