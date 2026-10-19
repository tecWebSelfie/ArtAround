'use client'

import { Select } from '@mantine/core'
import { usePathname, useRouter } from 'next/navigation'
import { Trans, useT } from 'next-i18next/client'
import type { Route } from 'next'

/**
 * Language picker for logged-in users: persists to `user.preferences.locale`,
 * refreshes the JWT (which carries `preferences` via `saveToJWT`), then
 * re-renders the page in the new locale. Guests get `Accept-Language`,
 * so the picker stays hidden for them.
 */
export function LanguageSwitcher({ supportedLngs }: { supportedLngs: string[] }) {
  const { i18n, t } = useT()

  const pathname = usePathname()
  const router = useRouter()

  const switchLocale = (locale: string) => {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/') as Route)
  }

  return (
    <Select
      label={
        <Trans t={t} i18nKey="languageSwitcher.label" default>
          Select Language
        </Trans>
      }
      data={[
        i18n.language,
        ...supportedLngs
          .map((lng) => ({ value: lng, label: lng }))
          .filter((lng) => lng.value !== i18n.language),
      ]}
      value={i18n.language}
      onChange={(value) => {
        // Mantine passes `null` when the select is cleared; the second
        // argument is also nullable. The first argument is the stable source
        // of truth for both string and object data.
        if (value) switchLocale(value)
      }}
      w={140}
    />
  )
}
