'use client'

import { Badge, Combobox, Group, Text, UnstyledButton, useCombobox } from '@mantine/core'
import IsoCodes from 'iso-639-1'
import { Languages, Search } from 'lucide-react'
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
 * The trigger is a round badge showing the language's code, with a small
 * translate mark on its corner (see the trigger below). The list opens below it with a search field, and each
 * option leads with its code tag (EN, FR, …), as visitors often know a
 * language by its tag better than by its own name.
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
  const code = i18n.language.toUpperCase()
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
        {/* A round badge whose content is the value, the language's code in
            bold ("IT"); the translate mark sits small on its corner as a hint
            of what the badge is (a soft gray disc with a darker ring, cut out
            of the badge's edge by a page-colored halo). Same hairline border
            as the museum pill beside it, but round where that one is long,
            so the two settings tell apart at a glance. Both are drawn at 36px,
            close to the 20px wordmark beside them, and an `::after` 4px past
            the edge keeps a 44px touch target. */}
        <UnstyledButton
          onClick={() => combobox.toggleDropdown()}
          // The visible code is part of the accessible name (WCAG 2.5.3).
          aria-label={t('Language: {{name}}', {
            name: `${current} (${code})`,
            interpolation: { escapeValue: false },
          })}
          title={current}
          className="mantine-focus-auto relative grid size-9 shrink-0 place-items-center rounded-full border border-(--mantine-color-default-border) bg-(--mantine-color-body) transition-colors hover:bg-(--mantine-color-default-hover) after:absolute after:-inset-1 after:content-['']"
        >
          <Text span fz={13} fw={700} className="tracking-[0.04em]">
            {code}
          </Text>
          <span
            aria-hidden
            className="absolute -top-[5px] -right-[6px] grid size-[17px] place-items-center rounded-full border border-[light-dark(var(--mantine-color-gray-5),var(--mantine-color-dark-3))] bg-[light-dark(var(--mantine-color-gray-1),var(--mantine-color-dark-5))] text-[light-dark(var(--mantine-color-gray-8),var(--mantine-color-dark-0))] shadow-[0_0_0_2px_var(--mantine-color-body)]"
          >
            <Languages size={9} strokeWidth={2.5} />
          </span>
        </UnstyledButton>
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
