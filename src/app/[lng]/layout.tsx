// app/[lng]/layout.tsx
import { MantineColorSchemeScript } from '@/components/mantine/MantineColorSchemeScript'
import { fallbackLng, generateI18nStaticParams, getResources, getT } from '@/i18n.server'
import { mantineHtmlProps } from '@mantine/core'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { Viewport } from 'next'
import { notFound } from 'next/navigation'
import { I18nProvider } from 'next-i18next/client'
import i18nConfig from '../../../i18n.config'
import Providers from '../providers'

/**
 * The app is light only (Mantine's default scheme, no toggle): the browser
 * chrome takes the page background and native controls/scrollbars stay light.
 * Change both together with a dark theme.
 */
export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
}

export async function generateStaticParams() {
  return generateI18nStaticParams()
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lng]'>) {
  const { lng } = await params
  // The proxy skips paths with a dot, so any segment can arrive here (`e..n`,
  // `/evil.com`); `LanguageSwitcher` would throw a RangeError (500) on it.
  if (!(i18nConfig.supportedLngs as readonly string[]).includes(lng)) notFound()
  const { i18n } = await getT()
  const resources = getResources(i18n, undefined, [lng, fallbackLng])

  return (
    <html lang={lng} {...mantineHtmlProps}>
      <head>
        <MantineColorSchemeScript />
      </head>
      <body>
        <Providers>
          {/* Top-left: the bottom-right default covered the navbar's assistant button. */}
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
          {/* tanstack query provider */}
          <I18nProvider
            language={lng}
            resources={resources}
            supportedLngs={i18nConfig.supportedLngs}
            defaultNS={i18nConfig.defaultNS}
            fallbackLng={i18nConfig.fallbackLng}
            i18nextOptions={i18nConfig.i18nextOptions}
          >
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}
