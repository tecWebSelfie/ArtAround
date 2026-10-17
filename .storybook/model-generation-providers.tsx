import { ModalsProvider } from '@mantine/modals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { useState, type ReactNode } from 'react'

const i18n = createInstance()
void i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['map-editor'],
  resources: { en: { 'map-editor': {} } },
  initAsync: false,
})

export function ModelGenerationProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ModalsProvider>{children}</ModalsProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
