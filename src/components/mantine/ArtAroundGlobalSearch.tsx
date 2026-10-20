'use client'

import type { Difficulty } from '@/payload-types'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import {
  Badge,
  Combobox,
  ComboboxDropdown,
  ComboboxOption,
  ComboboxOptions,
  ComboboxProps,
  ComboboxTarget,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  useCombobox,
} from '@mantine/core'
import { useUncontrolled } from '@mantine/hooks'
import { BookOpen, Landmark, Route as RouteIcon, Search, Shapes, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DifficultyBadge } from './DifficultyBadge'
import { DurationBadge } from './DurationBadge'
import { LockedPriceBadge } from './LockedPriceBadge'

/**
 * Display-only shape returned by `/api/navigator-search`.
 *
 * The combobox does not receive full Payload documents, only what a row shows.
 * Tours and contents carry their essentials (time, difficulty; stops for a
 * tour, the price for a paid content); objects and people, used elsewhere,
 * render as a plain title row.
 */
export type AutoCompleteItem = {
  kind: 'content' | 'tour' | 'museum' | 'object' | 'user'
  key: string
  title: string
  /** Canonical localized URL (for example `/en/museum/ID`). */
  href: string
  subtitle?: string
  city?: string
  /** Tour: visit length; content: reading time. In minutes. */
  minutes?: number
  difficulty?: Difficulty
  /** Tour: number of stops. */
  stops?: number
  /** Content: list price in euro cents when paid. */
  priceCents?: number
}

export function ArtAroundGlobalSearch({
  items,
  onChange,
  value, // use it if you want to control the value of the input
  defaultValue, // use it if you want to set the initial value of the input (uncontrolled input)
  filter,
  ...props
}: ComboboxProps & {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
} & { items: AutoCompleteItem[]; filter?: (item: AutoCompleteItem) => boolean }) {
  const { t } = useTranslation('search')
  const [_value, handleChange] = useUncontrolled({
    value,
    defaultValue,
    onChange,
    finalValue: '',
  })
  const filteredOptions = items.filter(
    filter ??
      ((item) => {
        const label = `${item.title} ${item.subtitle ?? ''} ${item.city ?? ''}`
        return label.toLowerCase().includes(_value.toLowerCase())
      }),
  )
  const combobox = useCombobox()

  return (
    <Combobox {...props} store={combobox} offset={0}>
      <ComboboxTarget>
        <BorderAnimate radius="xl" borderWidth="sm" size="sm" duration={4}>
          <TextInput
            leftSection={<Search size={16} />}
            bd="1px solid purple"
            bdrs="xl"
            size="lg"
            radius="xl"
            w="100%"
            placeholder={t('Look for the next tour')}
            aria-label={t('Search tours, contents and museums')}
            value={_value}
            onChange={(e) => {
              handleChange(e.currentTarget.value)
              combobox.openDropdown()
              combobox.updateSelectedOptionIndex()
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </BorderAnimate>
      </ComboboxTarget>
      <ComboboxDropdown>
        <ComboboxOptions>
          {filteredOptions.map((item) => {
            if (item.kind === 'tour') {
              // Tours keep the drawn-border accent (DESIGN.md → Inputs).
              return (
                <BorderAnimate variant="draw" my="xs" key={item.href}>
                  <ComboboxOption value={item.href}>
                    <ResultRow item={item} />
                  </ComboboxOption>
                </BorderAnimate>
              )
            }
            return (
              <ComboboxOption value={item.href} key={item.href}>
                <ResultRow item={item} />
              </ComboboxOption>
            )
          })}
        </ComboboxOptions>
      </ComboboxDropdown>
    </Combobox>
  )
}

/** Leading mark per kind: the tour gradient, content teal, a plain museum. */
const KIND_ICON = {
  tour: { Icon: RouteIcon, variant: 'gradient', gradient: { from: 'grape', to: 'orange' } },
  content: { Icon: BookOpen, variant: 'light', color: 'teal' },
  museum: { Icon: Landmark, variant: 'light', color: 'blue' },
  object: { Icon: Shapes, variant: 'light', color: 'gray' },
  user: { Icon: UserRound, variant: 'light', color: 'gray' },
} as const

/**
 * One result. Everything is plain text and badges, no nested controls: the
 * whole option is the action (it opens the detail page).
 */
function ResultRow({ item }: { item: AutoCompleteItem }) {
  const { t } = useTranslation('search')
  const { Icon, ...mark } = KIND_ICON[item.kind]
  const kindLabel = {
    tour: t('Tour'),
    content: t('Content'),
    museum: t('Museum'),
    object: t('Object'),
    user: t('Person'),
  }[item.kind]
  // Literal `t()` calls so `i18next-cli extract` sees the labels.
  const difficultyLabel = { easy: t('Easy'), medium: t('Medium'), hard: t('Hard') }
  const hasDetails =
    item.minutes !== undefined ||
    item.difficulty !== undefined ||
    item.stops !== undefined ||
    item.priceCents !== undefined
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon {...mark} radius="xl" size="md" aria-label={kindLabel} role="img">
        <Icon size={14} aria-hidden />
      </ThemeIcon>
      <Stack gap={4} miw={0}>
        <Text fw={600} lh={1.3}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.subtitle}
          </Text>
        ) : null}
        {item.city && !item.subtitle?.includes(item.city) ? (
          <Text size="xs" c="dimmed">
            {item.city}
          </Text>
        ) : null}
        {hasDetails && (
          // The essentials for choosing: time and difficulty first.
          <Group gap={4}>
            {item.minutes !== undefined && (
              <DurationBadge time={item.minutes} size="xs" variant="light" color="gray" />
            )}
            {item.difficulty && (
              <DifficultyBadge difficulty={item.difficulty} size="xs" variant="light">
                {difficultyLabel[item.difficulty]}
              </DifficultyBadge>
            )}
            {item.stops !== undefined && (
              <Badge size="xs" variant="light" color="gray">
                {t('{{count}} stops', { count: item.stops })}
              </Badge>
            )}
            {item.priceCents !== undefined && (
              <LockedPriceBadge price={item.priceCents} size="xs" />
            )}
          </Group>
        )}
      </Stack>
    </Group>
  )
}
