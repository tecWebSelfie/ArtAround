import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import nodemailer from 'nodemailer'
import path from 'path'
import { buildConfig, LocalizationConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Payload Plugins
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { typesenseSearch } from '@rubixstudios/payload-typesense'
import { payloadPluginRBAC } from '@zealamic/payload-plugin-rbac'
import { payloadLFRs } from 'payload-lfrs'
import { phoneNumberPlugin } from 'payload-phone-number-plugin'

import { en } from '@payloadcms/translations/languages/en'
import { it } from '@payloadcms/translations/languages/it'
import IsoCodes from 'iso-639-1'
import { mintEndpoints } from './endpoints/mint'
import { generateObjectModelWorkflow } from './jobs/generateObjectModelWorkflow'
import {
  finalizeObjectModelWorkflow,
  interactiveObjectModelWorkflow,
} from './jobs/interactiveObjectModelWorkflow'
import { autoTranslatePlugin } from './plugins/autoTranslate'
import { loadObjectGenerationContext } from './tasks/loadObjectGenerationContext'
import { persistMintModelAssets } from './tasks/persistMintModelAssets'
import { pollMintModelOperation } from './tasks/pollMintModelOperation'
import { startMintModelGeneration } from './tasks/startMintModelGeneration'

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

export default buildConfig({
  endpoints: mintEndpoints,
  localization: localizationConfig,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { en, it },
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
    ObjectsModels,
    ObjectsThumbnails,
    Contents,
    ContentImages,
    // Generated or hand-written additions and versions of contents (/api/expand).
    ContentVariants,
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
    typesenseSearch({
      typesense: {
        apiKey: process.env.TYPESENSE_API_KEY || '',
        nodes: [
          {
            host: process.env.TYPESENSE_HOST || '',
            port: Number(process.env.TYPESENSE_PORT || 443),
            protocol: (process.env.TYPESENSE_PROTOCOL || 'https') as 'http' | 'https',
          },
        ],
        connectionTimeoutSeconds: 5,
      },
      collections: {
        museums: {
          enabled: true,
          searchFields: ['name', 'location'],
          displayName: 'Museums',
        },
        users: {
          enabled: true,
          searchFields: ['name', 'description'],
          displayName: 'Users',
        },
      },
    }),
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
      {
        cron: '*/5 * * * *', // Check every 5 minutes
        queue: 'default',
      },
    ],
    tasks: [
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
  email: nodemailerAdapter({
    defaultFromAddress: 'artaround@progettantisti.com',
    defaultFromName: 'Payload',
    // Nodemailer transportOptions
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || '587',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }),
  }),
})
