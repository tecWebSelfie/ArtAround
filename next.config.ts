import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import i18nConfig from './i18n.config'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Every locale i18next accepts, as one regex alternation (`en|it`) used by the
// redirect below. Derived from i18n.config.ts — the single source of truth —
// so adding a language there extends this pattern automatically.
const lngPattern = i18nConfig.supportedLngs.join('|')

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  // Load Payload's server packages with Node in production too, as
  // `withPayload` already does in development. Bundled by Turbopack,
  // evaluating payload.config.ts during `next build` threw "Cannot access 'vu'
  // before initialization" (module order inside @payloadcms/richtext-lexical's
  // prebuilt chunks), on a different route each run. These are the packages
  // withPayload externalizes in dev that this project uses.
  serverExternalPackages: [
    'payload',
    '@payloadcms/db-mongodb',
    '@payloadcms/email-nodemailer',
    '@payloadcms/graphql',
    '@payloadcms/plugin-redirects',
  ],
  // Dev only: lets a phone on the same Wi-Fi load `/_next/*` and HMR from the
  // PC's LAN address (Next blocks non-localhost origins otherwise).
  allowedDevOrigins: ['192.168.1.*'],
  redirects() {
    return [
      {
        source: `/:lng(${lngPattern})?`,
        destination: '/:lng*/navigator',
        permanent: false,
      },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        pathname: '/icons/**',
      },
    ],
    // Pascal's official item-catalog CDN (thumbnails / models / floor-plans
    // hardcoded in @pascal-app/editor). Verified public 200s — without this,
    // any next/image render of a catalog thumbnail throws
    // "next-image-unconfigured-host" (cf. ARTAROUND-3F).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'byrpxoiotywskoojsrzd.supabase.co',
        pathname: '/storage/v1/object/public/items/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  // @pascal-app/editor ships raw TSX via exports (main=None), so ensure Next
  // transpiles it (otherwise Turbopack reports "Unknown module type").
  transpilePackages: [
    '@pascal-app/core',
    '@pascal-app/nodes',
    '@pascal-app/viewer',
    '@pascal-app/editor',
  ],
}

export default withSentryConfig(withPayload(nextConfig, { devBundleServerPackages: false }), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'tecweb',

  project: 'artaround',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
