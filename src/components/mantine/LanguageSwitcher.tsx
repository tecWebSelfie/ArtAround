'use client'

import { Badge, Button, Combobox, Group, Text, useCombobox } from '@mantine/core'
import IsoCodes from 'iso-639-1'
import { ChevronDown, Languages, Search } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from 'next-i18next/client'
import type { Route } from 'next'
import { useState } from 'react'

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
 * The trigger is the same context chip as the museum switch beside it
 * (`CONTEXT_CHIP` below, which MuseumSwitch shares: a `default` pill, leading icon, the current
 * value, a chevron), so the two read as one pair of settings. It used to be a
 * filled gray Select with an up/down chevron next to a light-blue button, two
 * different vocabularies side by side. The list opens below it with a search
 * field, and each option leads with its code tag (EN, FR, …), as visitors
 * often know a language by its tag better than by its own name.
 */
export function LanguageSwitcher({ supportedLngs }: { supportedLngs: string[] }) {
  const { i18n, t } = useT()
  const pathname = usePathname()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      setSearch('')
    },
    onDropdownOpen: () => combobox.focusSearchInput(),
  })

  const current = languageName(i18n.language)
  const words = search.trim().toLowerCase()
  const options = supportedLngs
    .map((lng) => ({ value: lng, label: languageName(lng) }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .filter(
      (option) =>
        !words ||
        option.label.toLowerCase().includes(words) ||
        option.value.toLowerCase().startsWith(words),
    )

  const switchLocale = (locale: string) => {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/') as Route)
  }

  return (
    <Combobox
      store={combobox}
      width={220}
      position="bottom-end"
      onOptionSubmit={(value) => {
        combobox.closeDropdown()
        if (value !== i18n.language) switchLocale(value)
      }}
    >
      <Combobox.Target targetType="button">
        <Button
          {...CONTEXT_CHIP}
          leftSection={<Languages size={14} aria-hidden />}
          rightSection={<ChevronDown size={14} aria-hidden />}
          onClick={() => combobox.toggleDropdown()}
          // The visible name is part of the accessible one (WCAG 2.5.3).
          aria-label={t('Language: {{name}}', {
            name: current,
            interpolation: { escapeValue: false },
          })}
        >
          <Text span inherit truncate>
            {current}
          </Text>
        </Button>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          leftSection={<Search size={14} aria-hidden />}
          placeholder={t('Search a language')}
          aria-label={t('Search a language')}
        />
        <Combobox.Options mah={300} className="overflow-y-auto">
          {options.length ? (
            options.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                active={option.value === i18n.language}
              >
                <Group gap="xs" wrap="nowrap">
                  <Badge
                    size="sm"
                    radius="sm"
                    variant="light"
                    color="gray"
                    w={36}
                    className="shrink-0"
                  >
                    {option.value.toUpperCase()}
                  </Badge>
                  <Text size="sm">{option.label}</Text>
                </Group>
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>{t('No language matches.')}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}

/**
 * The tabs' context chips (language, museum): one look for both settings.
 * `default` (the page's own surface with a hairline border and body text),
 * not a colored variant, so the chips stay quieter than the page's actions;
 * the same compact height, so they line up.
 */
export const CONTEXT_CHIP = {
  variant: 'default',
  radius: 'xl',
  size: 'compact-sm',
  fw: 500,
  maw: '100%',
} as const
