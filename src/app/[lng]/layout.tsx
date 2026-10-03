// app/[lng]/layout.tsx
import { getT, getResources, generateI18nStaticParams, fallbackLng } from '@/i18n.server'
import { I18nProvider } from 'next-i18next/client'
import i18nConfig from '../../../i18n.config'

export async function generateStaticParams() {
  return generateI18nStaticParams()
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lng: string }>
}) {
  const { lng } = await params
  const { i18n } = await getT()
  const resources = getResources(i18n, undefined, [lng, fallbackLng])

  return (
    <html lang={lng}>
      <body>
        <I18nProvider
          language={lng}
          resources={resources}
          i18nextOptions={i18nConfig.i18nextOptions}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
