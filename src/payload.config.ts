import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { ensureContentAudioVariantIndex } from './lib/content-audio-index'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, LocalizationConfig } from 'payload'
import { GraphQLError, Kind, type SelectionSetNode, type ValidationRule } from 'graphql'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Payload Plugins
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { payloadPluginRBAC } from '@zealamic/payload-plugin-rbac'
import { payloadLFRs } from 'payload-lfrs'
import { phoneNumberPlugin } from 'payload-phone-number-plugin'

import { bg } from '@payloadcms/translations/languages/bg'
import { cs } from '@payloadcms/translations/languages/cs'
import { da } from '@payloadcms/translations/languages/da'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { es } from '@payloadcms/translations/languages/es'
import { et } from '@payloadcms/translations/languages/et'
import { fr } from '@payloadcms/translations/languages/fr'
import { hr } from '@payloadcms/translations/languages/hr'
import { hu } from '@payloadcms/translations/languages/hu'
import { it } from '@payloadcms/translations/languages/it'
import { lt } from '@payloadcms/translations/languages/lt'
import { lv } from '@payloadcms/translations/languages/lv'
import { nl } from '@payloadcms/translations/languages/nl'
import { pl } from '@payloadcms/translations/languages/pl'
import { pt } from '@payloadcms/translations/languages/pt'
import { ro } from '@payloadcms/translations/languages/ro'
import { sk } from '@payloadcms/translations/languages/sk'
import { sl } from '@payloadcms/translations/languages/sl'
import { sv } from '@payloadcms/translations/languages/sv'
import IsoCodes from 'iso-639-1'
import { mintEndpoints } from './endpoints/mint'
import { generateObjectModelWorkflow } from './jobs/generateObjectModelWorkflow'
import {
  finalizeObjectModelWorkflow,
  interactiveObjectModelWorkflow,
} from './jobs/interactiveObjectModelWorkflow'
import { autoTranslatePlugin } from './plugins/autoTranslate'
import { uploadsDirPlugin } from './plugins/uploadsDir'
import { loadObjectGenerationContext } from './tasks/loadObjectGenerationContext'
import { persistMintModelAssets } from './tasks/persistMintModelAssets'
import { pollMintModelOperation } from './tasks/pollMintModelOperation'
import { startMintModelGeneration } from './tasks/startMintModelGeneration'
import { generateContentAudioTask } from './tasks/generateContentAudio'
import { ContentAudio } from './collections/ContentAudio'
import { AUDIO_QUEUE } from './lib/content-audio'
import { Subjects } from './collections/Subjects'
import { importWikidataSubjectsTask } from './tasks/importWikidataSubjects'
import { WIKIDATA_QUEUE } from './lib/wikidata'

import { ContentImages, Contents } from './collections/Contents'
import { ContentVariants } from './collections/ContentVariants'
import { MuseumCategories } from './collections/MuseumCategories'
import { MuseumMaps, Museums, MuseumThumbnails } from './collections/Museums'
import { Objects, ObjectsModels, ObjectsThumbnails } from './collections/Objects'
import { Purchases } from './collections/Purchases'
import { QuizAttempts } from './collections/QuizAttempts'
import { QuizQuestions } from './collections/QuizQuestions'
import { Tour, ToursThumbnails } from './collections/Tours'
import { UserMuseumMembership, Users, UsersPropics } from './collections/Users'
import { museumFunctionField } from './fields/MuseumFunction'
import { onCheckoutCompleted } from './hooks/onCheckoutCompleted'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const localizationConfig: LocalizationConfig = {
  defaultLocale: 'en',
  locales: IsoCodes.getAllCodes()
    .map((isoCode) => ({
      label: IsoCodes.getNativeName(isoCode) || IsoCodes.getName(isoCode),
      code: isoCode,
      fallbackLocale: 'en',
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  fallback: true,
}

/**
 * Nightly QA 2026-11-19 (N9): Payload's `maxComplexity` doesn't weigh join
 * fields, so `author{authoredContents{docs{author{...}}}}` multiplies the work
 * ~10x per level and 4 levels kill the Node process. The app and the admin
 * panel use REST, so this rule only caps how deeply a GraphQL document may
 * nest fields (introspection `__` fields skipped, fragments followed).
 */
const MAX_GRAPHQL_DEPTH = 8
// Breadth caps (N9 follow-up): the same 2-join query under 30 aliases took
// ~9 s, so also bound the total field nodes per operation (aliases and
// fragment spreads expanded) and any literal `limit` argument. Limits passed
// through variables aren't visible to validation; Payload's own
// `defaultLimit`/`maxLimit` stay the bound there.
const MAX_GRAPHQL_FIELDS = 50
const MAX_GRAPHQL_LIMIT = 100
const depthLimitRule: ValidationRule = (context) => ({
  OperationDefinition(operation) {
    const fragments = new Map(
      context
        .getDocument()
        .definitions.flatMap((d) =>
          d.kind === Kind.FRAGMENT_DEFINITION ? [[d.name.value, d] as const] : [],
        ),
    )
    let fieldCount = 0
    // Selections visited so far: fragments are re-expanded at every spread, so
    // a chain of fragments that each spread the next twice is exponential
    // even with no field in it. Past either budget the walk stops (the
    // operation is rejected below anyway when fields exceed the cap).
    let visited = 0
    let overBudget = false
    // `seen` guards against fragment cycles (reported separately by graphql-js).
    const depthOf = (set: SelectionSetNode, seen: ReadonlySet<string>): number => {
      visited += set.selections.length
      if (fieldCount > MAX_GRAPHQL_FIELDS || visited > MAX_GRAPHQL_FIELDS * 20) {
        overBudget = true
        return 0
      }
      return Math.max(
        0,
        ...set.selections.map((sel): number => {
          if (sel.kind === Kind.FIELD) {
            if (sel.name.value.startsWith('__')) return 0
            fieldCount++
            for (const arg of sel.arguments ?? []) {
              if (
                arg.name.value === 'limit' &&
                arg.value.kind === Kind.INT &&
                Number(arg.value.value) > MAX_GRAPHQL_LIMIT
              ) {
                context.reportError(
                  new GraphQLError(`Argument "limit" is above ${MAX_GRAPHQL_LIMIT}.`, {
                    nodes: [arg],
                  }),
                )
              }
            }
            return 1 + (sel.selectionSet ? depthOf(sel.selectionSet, seen) : 0)
          }
          if (sel.kind === Kind.INLINE_FRAGMENT) return depthOf(sel.selectionSet, seen)
          const fragment = fragments.get(sel.name.value)
          if (!fragment || seen.has(sel.name.value)) return 0
          return depthOf(fragment.selectionSet, new Set(seen).add(sel.name.value))
        }),
      )
    }
    const depth = depthOf(operation.selectionSet, new Set())
    if (overBudget || fieldCount > MAX_GRAPHQL_FIELDS) {
      context.reportError(
        new GraphQLError(
          `Query selects ${fieldCount} fields, the limit is ${MAX_GRAPHQL_FIELDS}.`,
          {
            nodes: [operation],
          },
        ),
      )
    }
    if (depth > MAX_GRAPHQL_DEPTH) {
      context.reportError(
        new GraphQLError(
          `Query is too deeply nested: ${depth} levels, the limit is ${MAX_GRAPHQL_DEPTH}.`,
          {
            nodes: [operation],
          },
        ),
      )
    }
  },
})

export default buildConfig({
  graphQL: { validationRules: () => [depthLimitRule] },
  onInit: ensureContentAudioVariantIndex,
  endpoints: mintEndpoints,
  localization: localizationConfig,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    // Admin panel languages: the app's EU languages that Payload ships
    // translations for (no el, fi, ga, mt yet; those admins see English).
    supportedLanguages: {
      bg,
      cs,
      da,
      de,
      en,
      es,
      et,
      fr,
      hr,
      hu,
      it,
      lt,
      lv,
      nl,
      pl,
      pt,
      ro,
      sk,
      sl,
      sv,
    },
    fallbackLanguage: 'en',
  },
  collections: [
    Users,
    UserMuseumMembership,
    UsersPropics,
    Museums,
    MuseumCategories,
    MuseumThumbnails,
    MuseumMaps,
    Objects,
    // Authors, movements and events of the works (src/lib/wikidata.ts).
    Subjects,
    ObjectsModels,
    ObjectsThumbnails,
    Contents,
    ContentImages,
    // Generated or hand-written additions and versions of contents (/api/expand).
    ContentVariants,
    // Read-aloud MP3 of each content's text, per locale (src/lib/content-audio.ts).
    ContentAudio,
    Tour,
    ToursThumbnails,
    QuizQuestions,
    QuizAttempts,
    // Stripe receipts: who may read which paid content (src/lib/entitlements.ts).
    Purchases,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [
    // On-demand AI translation (wraps @focus-reactive/payload-plugin-translator).
    // Just list the collections — the wrapper mounts
    // GET /api/{slug}/:id/localized?locale=xx on each of them.
    // GROQ_API_KEY goes in `.env` / `.env.local` (server-only, never NEXT_PUBLIC_).
    autoTranslatePlugin({
      collections: [
        Museums,
        MuseumCategories,
        MuseumThumbnails,
        Objects,
        // Wikidata fills the names it has; the translator covers the rest.
        Subjects,
        Contents,
        ContentImages,
        Tour,
      ],
      // Translated, but without the public `/localized` read: questions carry their answer.
      serverOnly: [QuizQuestions],
    }),
    // Stripe — sandbox only. The secret key must be a test key (`sk_test_…`).
    // Purchase/entitlement rows live in the `purchases` collection, written by
    // the `checkout.session.completed` webhook below (and reconciled on the
    // success page). See `src/lib/purchases.ts` and `src/lib/entitlements.ts`.
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
      // Purely cosmetic: makes the admin "View in Stripe" links point at
      // dashboard.stripe.com/test/…. Sandbox vs live is decided by the key.
      isTestKey: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_'),
      // Without this secret, POST /api/stripe/webhooks accepts events but
      // silently does nothing. Local dev: `stripe listen --forward-to
      // localhost:3000/api/stripe/webhooks` prints the `whsec_…` value.
      stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET,
      logs: true,
      webhooks: {
        'checkout.session.completed': onCheckoutCompleted,
      },
    }),
    formBuilderPlugin({
      // see below for a list of available options
    }),
    mcpPlugin({
      // see below for a list of available options
      collections: {
        museums: { enabled: true },
        objects: { enabled: true },
        contents: { enabled: true },
        tours: { enabled: true },
        museumCategories: { enabled: true },
        museumMaps: { enabled: true },
        museumThumbnails: { enabled: true },
        objectsModels: { enabled: true },
        objectsThumbnails: { enabled: true },
        contentImages: { enabled: true },
        roles: { enabled: true },
        'permission-actions': { enabled: true },
        permissions: { enabled: true },
        'permission-features': { enabled: true },
        'roles-permissions': { enabled: true },
        'user-museum-memberships': { enabled: true },
        toursThumbnails: { enabled: true },
        users: { enabled: true },
        usersPropics: { enabled: true },
        imports: { enabled: true },
        exports: { enabled: true },
      },
    }),
    importExportPlugin({
      // `museums`: exporting a museum gives the config file that locks the
      // app to it ("Change museum" → Import a config file, MuseumSwitch).
      collections: [{ slug: 'users' }, { slug: 'roles' }, { slug: 'museums' }],
    }),
    phoneNumberPlugin(),
    payloadPluginRBAC({
      // Adds the `createdBy` ownership field these collections' access rules
      // rely on. Per-museum permissions themselves live in `src/access/`
      // (memberships), not in the global role matrix. Quiz questions need it
      // for `mode: 'modify'` data-scope checks.
      targetCollections: [Museums.slug, Objects.slug, Contents.slug, Tour.slug, QuizQuestions.slug],
      collections: {
        roles: {
          fields: [museumFunctionField],
        },
      },
      translations: {
        en: {
          components: {
            rolePermissionMatrix: {
              features: {
                Museum: 'Museum',
                Content: 'Content',
                Object: 'Object',
              },
              actions: {
                Create: 'Create',
                Read: 'Read',
                Update: 'Update',
                Delete: 'Delete',
              },
            },
          },
        },
      },
    }),
    payloadLFRs({
      collections: {
        // Target collection slug
        museums: {
          likes: false, // Enable likes for authenticated users
          dislikes: false, // Enable dislikes (mutually exclusive with likes)
          favourites: true, // Enable favourites
          ratings: false, // Enable ratings (stored directly in reviews)
          reviews: false, // Enable reviews
          shares: true, // Enable social sharing and track share counts
        },
        objects: {
          likes: false, // Enable likes for authenticated users
          dislikes: false, // Enable dislikes (mutually exclusive with likes)
          favourites: true, // Enable favourites
          ratings: false, // Enable ratings (stored directly in reviews)
          reviews: false, // Enable reviews
          shares: true, // Enable social sharing and track share counts
        },
        contents: {
          likes: false, // Enable likes for authenticated users
          dislikes: false, // Enable dislikes (mutually exclusive with likes)
          favourites: true, // Enable favourites
          ratings: true, // Enable ratings (stored directly in reviews)
          reviews: false, // Enable reviews
          shares: true, // Enable social sharing and track share counts
        },
        tours: {
          likes: false, // Enable likes for authenticated users
          dislikes: false, // Enable dislikes (mutually exclusive with likes)
          favourites: true, // Enable favourites
          ratings: true, // Enable ratings (stored directly in reviews)
          reviews: false, // Enable reviews
          shares: true, // Enable social sharing and track share counts
        },
      },
      // Configure global rating options
      rating: {
        max: 5, // Max rating scale value (default: 5)
        step: 0.5, // Value increment steps (default: 1)
        icon: 'star', // Icon identifier hint for frontend (default: 'star')
      },
      // Workaround for payload-lfrs bug: indexes reference `status` even when
      // moderation is off, so we enable it to create the field and validate.
      // Moderation UI is unused.
      reviewModeration: true,
      adminControls: true, // Set to false to hide the Global Settings from the Admin UI
      adminGroup: 'LFRs', // Navigation group name in the Admin panel (default: 'LFRs')
      // Custom callback to check if a user is an admin
      isAdmin: ({ req }) => req.user?.collection === 'users' && Boolean(req.user?.isSuperAdmin),
    }),
    // Last: places every upload collection's files, those added by the
    // plugins above included (`UPLOADS_DIR`, src/plugins/uploadsDir.ts).
    uploadsDirPlugin(),
  ],
  bin: [
    {
      key: 'seed',
      scriptPath: path.resolve(dirname, 'seed.ts'),
    },
  ],
  jobs: {
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: {
        ...defaultJobsCollection.access,
        read: ({ req }): import('payload').AccessResult =>
          req.user
            ? {
                and: [
                  { workflowSlug: { in: ['interactiveObjectModel', 'finalizeObjectModel'] } },
                  { 'input.requestedBy': { equals: String(req.user.id) } },
                ],
              }
            : false,
      },
    }),
    enableConcurrencyControl: true,
    deleteJobOnComplete: false,
    autoRun: [
      { cron: '*/5 * * * * *', queue: 'interactive-models', disableScheduling: true },
      // Content audio: a visitor waits for it after pressing "Listen".
      { cron: '*/5 * * * * *', queue: AUDIO_QUEUE, disableScheduling: true },
      // Wikidata imports: a curator who sets a work's id sees its author soon.
      { cron: '*/10 * * * * *', queue: WIKIDATA_QUEUE, disableScheduling: true },
      {
        cron: '*/5 * * * *', // Check every 5 minutes
        queue: 'default',
      },
    ],
    tasks: [
      generateContentAudioTask, // reads a content aloud (src/lib/content-audio.ts)
      importWikidataSubjectsTask, // links a work to its author, movement, events
      loadObjectGenerationContext, //this prepares the prompt and checks for model generation
      startMintModelGeneration, //this starts the model generation on Mint and returns the operation ID
      pollMintModelOperation, //this polls the Mint operation until it is completed or failed
      persistMintModelAssets, //when polling returns success, persists model and thumbnail to object collection
    ],
    workflows: [
      generateObjectModelWorkflow,
      interactiveObjectModelWorkflow,
      finalizeObjectModelWorkflow,
    ],
  },
  // No email adapter: the project gave up on email (no verification or password
  // reset flows). Payload only logs a warning that emails go to the console.
})
