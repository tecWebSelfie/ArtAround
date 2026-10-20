import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import nodemailer from 'nodemailer'
import path from 'path'
import { buildConfig, LocalizationConfig, type Field } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Payload Plugins
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { searchPlugin } from '@payloadcms/plugin-search'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { payloadPluginRBAC } from '@zealamic/payload-plugin-rbac'
import { payloadLFRs } from 'payload-lfrs'
import { phoneNumberPlugin } from 'payload-phone-number-plugin'

import { en } from '@payloadcms/translations/languages/en'
import { it } from '@payloadcms/translations/languages/it'
import IsoCodes from 'iso-639-1'
import { mintEndpoints } from './endpoints/mint'
import { generateObjectModelWorkflow } from './jobs/generateObjectModelWorkflow'
import {
  interactiveObjectModelWorkflow,
  finalizeObjectModelWorkflow,
} from './jobs/interactiveObjectModelWorkflow'
import { autoTranslatePlugin } from './plugins/autoTranslate'
import { loadObjectGenerationContext } from './tasks/loadObjectGenerationContext'
import { persistMintModelAssets } from './tasks/persistMintModelAssets'
import { pollMintModelOperation } from './tasks/pollMintModelOperation'
import { startMintModelGeneration } from './tasks/startMintModelGeneration'

import { ContentImages, Contents } from './collections/Contents'
import { MuseumCategories } from './collections/MuseumCategories'
import { MuseumMaps, Museums, MuseumThumbnails } from './collections/Museums'
import { Objects, ObjectsModels, ObjectsThumbnails } from './collections/Objects'
import { Purchases } from './collections/Purchases'
import { Tour, ToursThumbnails } from './collections/Tours'
import { UserMuseumMembership, Users, UsersPropics } from './collections/Users'
import { museumFunctionField } from './fields/MuseumFunction'
import { onCheckoutCompleted } from './hooks/onCheckoutCompleted'
import {
  buildSearchDoc,
  SEARCH_KINDS,
  SEARCH_PLUGIN_COLLECTIONS,
  SEARCH_PRIORITIES,
  type SearchPluginCollection,
} from './lib/search-index'

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
    Tour,
    ToursThumbnails,
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
      },
    }),
    importExportPlugin({
      collections: [{ slug: 'users' }, { slug: 'roles' }],
    }),
    phoneNumberPlugin(),
    payloadPluginRBAC({
      targetCollections: [Museums.slug, Objects.slug, Contents.slug, Tour.slug],
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
    // Unified Payload-native search index. The plugin owns the generated
    // `search` collection and keeps it in sync from the source collections.
    // `beforeSync` flattens localized titles, rich text and museum city into
    // plain searchable text, and exposes the flat fields used by the
    // marketplace filters (kind + priceCents).
    searchPlugin({
      collections: [...SEARCH_PLUGIN_COLLECTIONS],
      // Index one stable (English) projection instead of one row per locale.
      // Cards are hydrated in the visitor's locale from the original document.
      localize: false,
      defaultPriorities: { ...SEARCH_PRIORITIES },
      beforeSync: async ({ collectionSlug, originalDoc, payload, req, searchDoc }) => {
        if (!SEARCH_PLUGIN_COLLECTIONS.includes(collectionSlug as SearchPluginCollection)) {
          return searchDoc
        }
        const data = await buildSearchDoc({
          payload,
          collection: collectionSlug as SearchPluginCollection,
          id: String(searchDoc.doc.value ?? originalDoc.id),
          req,
        })
        return { ...searchDoc, ...data }
      },
      searchOverrides: {
        fields: ({ defaultFields }): Field[] => [
          ...defaultFields,
          {
            name: 'kind',
            type: 'select',
            required: true,
            index: true,
            options: SEARCH_KINDS.map((kind) => ({
              label: kind.charAt(0).toUpperCase() + kind.slice(1),
              value: kind,
            })),
            admin: { readOnly: true },
          },
          {
            name: 'excerpt',
            type: 'textarea',
            admin: { readOnly: true },
          },
          {
            name: 'city',
            type: 'text',
            index: true,
            admin: { readOnly: true },
          },
          {
            name: 'priceCents',
            type: 'number',
            index: true,
            admin: { readOnly: true },
          },
          {
            name: 'sourceCreatedAt',
            type: 'date',
            index: true,
            admin: { readOnly: true },
          },
        ],
        admin: {
          defaultColumns: ['title', 'kind', 'city', 'priority'],
          useAsTitle: 'title',
          description:
            'Automatically generated search rows. Use the Reindex button after changing search configuration.',
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
