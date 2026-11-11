'use client'

import { TOUR_GRADIENT } from '@/theme'
import type { Difficulty } from '@/payload-types'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import {
  Badge,
  Combobox,
  ComboboxDropdown,
  ComboboxEmpty,
  ComboboxOption,
  ComboboxOptions,
  ComboboxProps,
  ComboboxTarget,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  useCombobox,
} from '@mantine/core'
import { useUncontrolled } from '@mantine/hooks'
import {
  ArrowRight,
  BookOpen,
  Landmark,
  RotateCw,
  Route as RouteIcon,
  Search,
  Shapes,
  UserRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ClearSearchButton } from './ClearSearchButton'
import { PaidMark } from './PaidMark'
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
  /** Tour: visit length; content: its length. In seconds. */
  seconds?: number
  difficulty?: Difficulty
  /** Tour: number of stops. */
  stops?: number
  /** Content: list price in euro cents when paid. */
  priceCents?: number
}

/**
 * Where the owner's request stands: `loading` while the results shown are not
 * yet those of the current text (they stay visible, dimmed, so the list does
 * not jump), `error` when the last request failed.
 */
export type SearchStatus = 'idle' | 'loading' | 'error'

/**
 * Option values that are actions rather than result pages. They live in the
 * listbox, so a keyboard or screen-reader user reaches them like any result.
 */
const RETRY_VALUE = '__retry'

export function ArtAroundGlobalSearch({
  items,
  onChange,
  value, // use it if you want to control the value of the input
  defaultValue, // use it if you want to set the initial value of the input (uncontrolled input)
  filter,
  status = 'idle',
  onRetry,
  browse,
  onOptionSubmit,
  ...props
}: ComboboxProps & {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
} & {
  items: AutoCompleteItem[]
  filter?: (item: AutoCompleteItem) => boolean
  status?: SearchStatus
  /** Called by the "Try again" option shown when `status` is `error`. */
  onRetry?: () => void
  /** A way out when nothing matches: the option opens `href` like a result. */
  browse?: { label: string; href: string }
}) {
  const { t } = useTranslation('search')
  const [_value, handleChange] = useUncontrolled({
    value,
    defaultValue,
    onChange,
    finalValue: '',
  })
  const combobox = useCombobox()
  const query = _value.trim()
  const loading = status === 'loading'
  // After a failure, whatever items the owner still passes belong to an
  // earlier text: hide them, so the error and its retry are what the list says.
  const filteredOptions =
    status === 'error'
      ? []
      : items.filter(
          filter ??
            ((item) => {
              const label = `${item.title} ${item.subtitle ?? ''} ${item.city ?? ''}`
              return label.toLowerCase().includes(_value.toLowerCase())
            }),
        )
  // Nothing at all to say (no text, no suggestions, nothing pending): keep the
  // dropdown hidden rather than open an empty bordered sliver.
  const nothingToShow = filteredOptions.length === 0 && status === 'idle' && !query

  return (
    // The animated border wraps the whole combobox, not the input: the
    // input itself must be the combobox target, so it carries `aria-expanded`
    // and `aria-controls` and screen readers announce the result list. The
    // dropdown renders in a portal, so the border only frames the field.
    <BorderAnimate radius="xl" borderWidth="sm" size="sm" duration={4}>
      {/* The results float over the page (on the navigator, over the start
          cards): a medium shadow lifts the list off what lies beneath it. */}
      <Combobox
        shadow="md"
        {...props}
        store={combobox}
        offset={0}
        onOptionSubmit={(optionValue, optionProps) => {
          if (optionValue === RETRY_VALUE) {
            onRetry?.()
            return
          }
          onOptionSubmit?.(optionValue, optionProps)
        }}
      >
        {/* `aria-expanded` too (Mantine leaves it off by default), so a
            screen reader says whether the result list is open. */}
        <ComboboxTarget withExpandedAttribute>
          <TextInput
            leftSection={<Search size={16} />}
            rightSection={
              // The clear button wins once there is text; with an empty field
              // the spinner shows while the default suggestions load (first
              // visit, or right after clearing).
              _value ? (
                <ClearSearchButton
                  onClear={() => {
                    // Through `handleChange`, so the owner's query resets too
                    // and the default results come back.
                    handleChange('')
                    combobox.openDropdown()
                  }}
                />
              ) : loading ? (
                <Loader size="xs" aria-hidden />
              ) : null
            }
            rightSectionPointerEvents="all"
            // Search terms are names and places, not prose: no red squiggles.
            spellCheck={false}
            autoComplete="off"
            // The search's violet edge as theme tokens (it was CSS `purple`):
            // violet.7 on the light field, violet.4 on the dark one, both
            // above the 3:1 a control's boundary needs.
            bd="1px solid light-dark(var(--mantine-color-violet-7), var(--mantine-color-violet-4))"
            bdrs="xl"
            size="lg"
            radius="xl"
            w="100%"
            // What visitors can type (a tour, a museum, a city); it used to
            // promise only tours. The aria-label names the full scope.
            placeholder={t('Search tours, museums, cities')}
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
        </ComboboxTarget>
        {/* A darker border than Mantine's default gray-2, so the list edge reads
          clearly against white cards in light mode and the dark page in dark. */}
        <ComboboxDropdown
          hidden={nothingToShow}
          bd="1px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))"
        >
          {/* Stale results stay in place while the new ones load, dimmed and
              marked busy, so the visitor sees the request is under way and
              the list does not collapse between keystrokes. */}
          <ComboboxOptions
            aria-busy={loading}
            className="transition-opacity duration-150 data-[busy=true]:opacity-50"
            data-busy={loading && filteredOptions.length > 0}
          >
            {/* Every row alike: the kind icon already marks a tour (the tour
                gradient), so tours no longer draw an animated border too. */}
            {filteredOptions.map((item) => (
              <ComboboxOption value={item.href} key={item.href}>
                <ResultRow item={item} />
              </ComboboxOption>
            ))}
            {filteredOptions.length === 0 && (
              <SearchFallback
                status={status}
                query={query}
                browse={browse}
                canRetry={onRetry !== undefined}
              />
            )}
          </ComboboxOptions>
        </ComboboxDropdown>
      </Combobox>
    </BorderAnimate>
  )
}

/**
 * What the open list shows when it has no result to offer: a loading line,
 * the failed request with a way to retry, or the empty search with a hint and
 * a way out. Without it the open dropdown was an empty sliver, and an error
 * looked exactly like "nothing matched".
 */
function SearchFallback({
  status,
  query,
  browse,
  canRetry,
}: {
  status: SearchStatus
  query: string
  browse?: { label: string; href: string }
  canRetry: boolean
}) {
  const { t } = useTranslation('search')

  if (status === 'loading') {
    return (
      <ComboboxEmpty>
        <Group gap="xs" justify="center">
          <Loader size="xs" aria-hidden />
          <Text size="sm" c="dimmed">
            {t('Searching…')}
          </Text>
        </Group>
      </ComboboxEmpty>
    )
  }

  if (status === 'error') {
    return (
      <>
        <ComboboxEmpty>
          <Text size="sm">{t('Search is not reachable right now.')}</Text>
        </ComboboxEmpty>
        {canRetry && (
          <ComboboxOption value={RETRY_VALUE}>
            <Group gap="xs" justify="center" c="var(--mantine-primary-color-filled)">
              <RotateCw size={16} aria-hidden />
              <Text size="sm" fw={600} c="inherit">
                {t('Try again')}
              </Text>
            </Group>
          </ComboboxOption>
        )}
      </>
    )
  }

  // No text and no suggestions: the owner hides the dropdown in this case.
  if (!query) return null

  return (
    <>
      <ComboboxEmpty>
        <Stack gap={2}>
          <Text size="sm">
            {t('Nothing matches “{{query}}”.', {
              query,
              // React escapes the text already; i18next's own escaping would
              // show "Sant'Anna" as "Sant&#39;Anna".
              interpolation: { escapeValue: false },
            })}
          </Text>
          <Text size="sm" c="dimmed">
            {t('Try a city, a museum or a shorter word.')}
          </Text>
        </Stack>
      </ComboboxEmpty>
      {browse && (
        <ComboboxOption value={browse.href}>
          <Group gap="xs" justify="center" c="var(--mantine-primary-color-filled)">
            <Text size="sm" fw={600} c="inherit">
              {browse.label}
            </Text>
            <ArrowRight size={16} aria-hidden />
          </Group>
        </ComboboxOption>
      )}
    </>
  )
}

/** Leading mark per kind: the tour gradient, content teal, a plain museum. */
const KIND_ICON = {
  tour: { Icon: RouteIcon, variant: 'gradient', gradient: TOUR_GRADIENT },
  content: { Icon: BookOpen, variant: 'light', color: 'teal' },
  museum: { Icon: Landmark, variant: 'light', color: 'museum' },
  object: { Icon: Shapes, variant: 'light', color: 'gray' },
  user: { Icon: UserRound, variant: 'light', color: 'gray' },
} as const

/**
 * One result. Everything is plain text and badges, no nested controls: the
 * whole option is the action (it opens the detail page).
 */
function ResultRow({ item }: { item: AutoCompleteItem }) {
  const { t, i18n } = useTranslation('search')
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
    item.seconds !== undefined ||
    item.difficulty !== undefined ||
    item.stops !== undefined ||
    item.priceCents !== undefined
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon {...mark} radius="xl" size="md" aria-label={kindLabel} role="img">
        <Icon size={14} aria-hidden />
      </ThemeIcon>
      <Stack gap={4} miw={0}>
        <Group gap={6} wrap="nowrap" align="flex-start">
          <Text fw={600} lh={1.3}>
            {item.title}
          </Text>
          {/* Paid at a glance, beside the title; the price badge below says how much. */}
          {item.priceCents !== undefined && <PaidMark />}
        </Group>
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
            {item.seconds !== undefined && (
              <DurationBadge
                seconds={item.seconds}
                lng={i18n.language}
                size="xs"
                variant="light"
                color="gray"
              />
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
