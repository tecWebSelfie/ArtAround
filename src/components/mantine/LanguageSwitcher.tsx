'use client'

import { Select } from '@mantine/core'
import IsoCodes from 'iso-639-1'
import { usePathname, useRouter } from 'next/navigation'
import { Trans, useT } from 'next-i18next/client'
import type { Route } from 'next'

/** A language by its own name ("Deutsch", "Ελληνικά"), so anyone finds theirs. */
function languageName(code: string) {
  const name = IsoCodes.getNativeName(code) || code.toUpperCase()
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1)
}

/**
 * Language picker: swaps the `/{lng}` segment of the current URL, so the page
 * re-renders in the chosen language (the i18n proxy then remembers it in its
 * cookie). Searchable, since the app speaks every official EU language.
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
      data={supportedLngs
        .map((lng) => ({ value: lng, label: languageName(lng) }))
        .sort((a, b) => a.label.localeCompare(b.label))}
      value={i18n.language}
      searchable
      allowDeselect={false}
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
