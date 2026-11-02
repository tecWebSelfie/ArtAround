'use client'

import { Alert, Button, Group, Text } from '@mantine/core'
import { Landmark } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { setMuseumMode } from '@/lib/museum-cookie'

const DISMISSED = 'aa-museum-offer-dismissed'

/**
 * Arrived from outside the app (a QR code shown on someone's screen, a shared
 * link: no referrer, or another site's) on a page that belongs to a museum
 * other than the one the app is locked to. Museum mode filters every list, so
 * it is offered, never imposed: printed codes are the only entry that switches
 * by themselves (`?museum=`, `src/proxy.ts`). Browsing inside the app never
 * shows it, and "Not now" hides it for that museum for the rest of the session.
 */
function readDismissed(): string[] {
  try {
    return sessionStorage.getItem(DISMISSED)?.split(',') ?? []
  } catch {
    return []
  }
}

function shouldOffer(museumId: string) {
  try {
    const external = !document.referrer || new URL(document.referrer).origin !== location.origin
    return external && !readDismissed().includes(museumId)
  } catch {
    return false
  }
}

const subscribe = () => () => {}

export function MuseumModeOffer({ museum }: { museum: { id: string; name: string } }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  // Decided in the browser (referrer, session storage); hidden on the server.
  const offer = useSyncExternalStore(
    subscribe,
    () => shouldOffer(museum.id),
    () => false,
  )
  const [closed, setClosed] = useState(false)
  const [pending, setPending] = useState(false)
  if (!offer || closed) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED, [...readDismissed(), museum.id].join(','))
    } catch {
      // Private mode or blocked storage: it just shows again next time.
    }
    setClosed(true)
  }

  const accept = async () => {
    setPending(true)
    const ok = await setMuseumMode({ id: museum.id, name: null })
    setPending(false)
    if (ok) {
      setClosed(true)
      router.refresh()
    }
  }

  return (
    <Alert variant="light" icon={<Landmark size={18} aria-hidden />} role="status">
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Text size="sm">{t('Are you at {{museum}}?', { museum: museum.name })}</Text>
        <Group gap="xs">
          <Button size="compact-sm" variant="subtle" color="gray" onClick={dismiss}>
            {t('Not now')}
          </Button>
          <Button size="compact-sm" loading={pending} onClick={() => void accept()}>
            {t("Use the museum's app")}
          </Button>
        </Group>
      </Group>
    </Alert>
  )
}
