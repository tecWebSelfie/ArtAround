'use client'

import { Group, Loader, Text } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * How often the page asks the server again, and for how long: 3 minutes, the
 * time the background queue needs for a long tour's stops (one every 10 s).
 */
const REFRESH_EVERY_MS = 4000
const GIVE_UP_AFTER_MS = 3 * 60_000
/**
 * The silent variant sits in the museum map's layout, whose refresh carries
 * the whole map again: it asks four times less often, for the same 3 minutes.
 */
const SILENT_REFRESH_EVERY_MS = 16_000

/**
 * Shown by a server page while a text it renders is still on its English
 * fallback (`requestTranslations` in src/lib/localized.ts queued the
 * translation): a quiet "translating" line that refreshes the route every few
 * seconds. The server stops rendering it once the translation is stored, so
 * the text swaps to the visitor's language without a reload and this unmounts.
 *
 * It gives up silently after `GIVE_UP_AFTER_MS` (the queue is down or the
 * provider failed): the English text stays readable and the next visit tries
 * again. A hidden tab doesn't poll.
 */
export function TranslationPending({
  silent = false,
}: {
  /**
   * Refresh without the line: for surfaces with no room for it (the map's
   * header and stepper), where the titles simply swap language.
   */
  silent?: boolean
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    const every = silent ? SILENT_REFRESH_EVERY_MS : REFRESH_EVERY_MS
    const limit = Math.ceil(GIVE_UP_AFTER_MS / every)
    let refreshes = 0
    const timer = setInterval(() => {
      if (document.hidden) return
      refreshes += 1
      if (refreshes > limit) {
        clearInterval(timer)
        setGaveUp(true)
        return
      }
      router.refresh()
    }, every)
    return () => clearInterval(timer)
  }, [router, silent])

  if (gaveUp || silent) return null
  return (
    <Group gap={6} wrap="nowrap" role="status">
      <Loader size={12} />
      <Text size="xs" c="dimmed">
        {t('Translating into your language…')}
      </Text>
    </Group>
  )
}
