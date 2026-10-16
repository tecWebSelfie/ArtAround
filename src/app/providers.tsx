'use client'

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minuto
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (environmentManager.isServer()) {
    // Mai condividere la cache tra richieste/server user diversi
    return makeQueryClient()
  }

  // Nel browser riusa sempre la stessa cache
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }

  return browserQueryClient
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
