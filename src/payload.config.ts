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
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { stripePlugin } from '@payloadcms/plugin-stripe'
import { payloadPluginRBAC } from '@zealamic/payload-plugin-rbac'
import { payloadLFRs } from 'payload-lfrs'
import { phoneNumberPlugin } from 'payload-phone-number-plugin'

import { en } from '@payloadcms/translations/languages/en'
import { it } from '@payloadcms/translations/languages/it'
import IsoCodes from 'iso-639-1'
import { autoTranslatePlugin } from './plugins/autoTranslate'

import { ContentImages, Contents } from './collections/Contents'
import { Exhibits } from './collections/Exhibits'
import { MuseumMaps, Museums, MuseumThumbnails } from './collections/Museums'
import { Objects, ObjectsThumbnails } from './collections/Objects'
import { Pages } from './collections/Pages'
import { Tour } from './collections/Tours'
import { Users } from './collections/Users'

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
    Pages,
    Museums,
    MuseumThumbnails,
    MuseumMaps,
    Objects,
    ObjectsThumbnails,
    Exhibits,
    Contents,
    ContentImages,
    Tour,
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
      collections: [Museums, MuseumThumbnails, Objects, Contents, ContentImages],
    }),
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', // Add your Stripe secret key here
    }),
    formBuilderPlugin({
      // see below for a list of available options
    }),
    mcpPlugin({
      // see below for a list of available options
      collections: {
        museums: { enabled: true },
        objects: { enabled: true },
        exhibits: { enabled: true },
        contents: { enabled: true },
      },
    }),
    redirectsPlugin({
      collections: ['pages'],
    }),
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => String(doc.title),
      generateURL: (docs) => docs.reduce((url, doc) => `${url}/${String(doc.slug)}`, ''),
    }),
    importExportPlugin({
      collections: [{ slug: 'users' }, { slug: 'pages' }, { slug: 'roles' }],
    }),
    phoneNumberPlugin(),
    payloadPluginRBAC({
      targetCollections: [Museums.slug, Objects.slug, Exhibits.slug, Contents.slug],
      translations: {
        en: {
          components: {
            rolePermissionMatrix: {
              features: {
                Museum: 'Museum',
                Content: 'Content',
                Object: 'Object',
                Exhibit: 'Exhibit',
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
  ],
  bin: [
    {
      key: 'seed',
      scriptPath: path.resolve(dirname, 'seed.ts'),
    },
  ],
  jobs: {
    autoRun: [
      {
        cron: '*/5 * * * *', // Check every 5 minutes
        queue: 'default',
      },
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
