'use client'

import { Select } from '@mantine/core'
import IsoCodes from 'iso-639-1'
import { Languages } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from 'next-i18next/client'
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
 *
 * A compact pill (no visible label, the icon and the language's own name say
 * what it is) that sits in the tabs' top bar next to the museum switch: in the
 * 64px bottom bar it squeezed the tab labels ("Navigat…", "Marketpla…").
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
      aria-label={t('languageSwitcher.label')}
      size="xs"
      radius="xl"
      variant="filled"
      leftSection={<Languages size={14} aria-hidden />}
      comboboxProps={{ width: 200, position: 'bottom-end' }}
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
      w={130}
    />
  )
}
