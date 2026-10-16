'use client'

import { useEffect, useState } from 'react'

// NOTE: env vars are always strings — Boolean("false") is true, so compare
// explicitly. MSW stays off unless NEXT_PUBLIC_API_MOCKING === 'true'.
const mockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'true'

// Module-level guard: React StrictMode double-mounts effects in dev, and a
// second worker.start() logs a "redundant call" warning.
let workerStarted = false

export default function MSWProvider({ children }: { children: React.ReactNode }) {
  // se NEXT_PUBLIC_API_MOCKING è impostato a false, ready è a true e renderizza direttamente l'app.
  // altrimenti, all'inizio renderizza "Loading Mock Service Worker..." e poi, quando il worker è pronto, renderizza l'app.
  const [ready, setReady] = useState(!mockingEnabled)

  useEffect(() => {
    if (!mockingEnabled) {
      return
    }

    async function enableMocking() {
      if (workerStarted) {
        setReady(true)
        return
      }
      workerStarted = true
      const { worker } = await import('./service')

      await worker.start({
        onUnhandledRequest: 'bypass',
      })

      setReady(true)
    }

    void enableMocking()
  }, [])

  if (!ready) {
    return <div>Loading Mock Service Worker...</div>
  }

  return children
}
