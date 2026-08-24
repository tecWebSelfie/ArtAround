'use client'

import { useEffect, useState } from 'react'

export default function MSWProvider({ children }: { children: React.ReactNode }) {
  // se NEXT_PUBLIC_API_MOCKING è impostato a false, ready è a true e renderizza direttamente l'app.
  // altrimenti, all'inizio renderizza "Loading Mock Service Worker..." e poi, quando il worker è pronto, renderizza l'app.
  const [ready, setReady] = useState(Boolean(process.env.NEXT_PUBLIC_API_MOCKING) !== true)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') {
      return
    }

    async function enableMocking() {
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
