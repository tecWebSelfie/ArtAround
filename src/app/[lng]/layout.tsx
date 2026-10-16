// app/[lng]/layout.tsx
import { MantineColorSchemeScript } from '@/components/mantine/MantineColorSchemeScript'
import { fallbackLng, generateI18nStaticParams, getResources, getT } from '@/i18n.server'
import { mantineHtmlProps } from '@mantine/core'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nProvider } from 'next-i18next/client'
import i18nConfig from '../../../i18n.config'
import Providers from '../providers'

export async function generateStaticParams() {
  return generateI18nStaticParams()
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lng]'>) {
  const { lng } = await params
  const { i18n } = await getT()
  const resources = getResources(i18n, undefined, [lng, fallbackLng])

  return (
    <html lang={lng} {...mantineHtmlProps}>
      <head>
        <MantineColorSchemeScript />
      </head>
      <body>
        <Providers>
          <ReactQueryDevtools initialIsOpen={false} />
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
