'use client'

import { Button, CloseButton, Group, Paper, Text } from '@mantine/core'
import { Landmark } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { setMuseumMode } from '@/lib/museum-cookie'

const DISMISSED = 'aa-museum-offer-dismissed'
/** How long "not now" holds for a museum: a later visit there asks again. */
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Arrived from outside the app (a QR code shown on someone's screen, a shared
 * link: no referrer, or another site's) on a page that belongs to a museum
 * other than the one the app is locked to. Museum mode filters every list, so
 * it is offered, never imposed: printed codes are the only entry that switches
 * by themselves (`?museum=`, `src/proxy.ts`). Browsing inside the app never
 * shows it.
 *
 * Kept quiet: one hairline row (the page's content leads, not this), the
 * question, a light "Use the museum's app" and an X. The X ("not now") holds
 * for that museum for 30 days in `localStorage`, across tabs and visits, so a
 * visitor who said no isn't asked at every shared link; after that a new
 * visit there may ask again.
 */
type Dismissals = Record<string, number>

function readDismissed(): Dismissals {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(DISMISSED) ?? '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    // Only the dismissals still in force: expired ones are dropped on write.
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(stored).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > now,
      ),
    )
  } catch {
    return {}
  }
}

function shouldOffer(museumId: string) {
  try {
    const external = !document.referrer || new URL(document.referrer).origin !== location.origin
    return external && !(museumId in readDismissed())
  } catch {
    return false
  }
}

const subscribe = () => () => {}

export function MuseumModeOffer({ museum }: { museum: { id: string; name: string } }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  // Decided in the browser (referrer, local storage); hidden on the server.
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
      const dismissed = { ...readDismissed(), [museum.id]: Date.now() + DISMISS_FOR_MS }
      localStorage.setItem(DISMISSED, JSON.stringify(dismissed))
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
    <Paper withBorder radius="md" py={6} pl="sm" pr={6} role="status">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Landmark
          size={16}
          aria-hidden
          className="mt-[0.2rem] shrink-0 text-(--mantine-color-dimmed)"
        />
        {/* The question takes the row while it fits beside the button (a
            14rem basis); on a narrow phone or in a long language the button
            wraps under it instead of squeezing it into a column. */}
        <Group gap={6} className="min-w-0 flex-1">
          <Text size="sm" className="flex-[1_1_14rem]">
            {t('Are you at {{museum}}?', { museum: museum.name })}
          </Text>
          <Button size="compact-sm" variant="light" loading={pending} onClick={() => void accept()}>
            {t("Use the museum's app")}
          </Button>
        </Group>
        <CloseButton size="sm" aria-label={t('Not now')} title={t('Not now')} onClick={dismiss} />
      </Group>
    </Paper>
  )
}
