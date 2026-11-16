'use client'

import { formatUnit } from '@/lib/duration'
import { distanceKm, type MuseumPoint } from '@/lib/museum-location'
import type { Difficulty } from '@/payload-types'
import { Fragment, useState } from 'react'
import { PLACEHOLDER_SURFACE } from './kind-fallback'
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
  Divider,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core'
import { useUncontrolled } from '@mantine/hooks'
import {
  ArrowRight,
  BookOpen,
  Landmark,
  Navigation,
  RotateCw,
  Route as RouteIcon,
  Search,
  Shapes,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
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
  /** Museum, or a tour's museum: [longitude, latitude], for the "near you" mark. */
  point?: MuseumPoint
  /** The row's thumbnail; without it the kind's placeholder tile stands in. */
  imageUrl?: string
  /** Museum: its palette color, the ring around its thumbnail. */
  color?: string
}

/** Within this many kilometres of the visitor, a result is marked as near them. */
const NEAR_KM = 5

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

/** The default filter: the text in the item's title, subtitle or city. */
const matchesText = (text: string) => (item: AutoCompleteItem) =>
  `${item.title} ${item.subtitle ?? ''} ${item.city ?? ''}`
    .toLowerCase()
    .includes(text.toLowerCase())

export function ArtAroundGlobalSearch({
  items,
  onChange,
  value, // use it if you want to control the value of the input
  defaultValue, // use it if you want to set the initial value of the input (uncontrolled input)
  filter,
  status = 'idle',
  onRetry,
  browse,
  origin,
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
  /**
   * The visitor's position when they already share it (`useDevicePosition`):
   * results with a `point` within `NEAR_KM` get a "near you" mark with the
   * distance. Computed here, so the position never leaves the device.
   */
  origin?: { latitude: number; longitude: number } | null
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
  const filteredOptions = status === 'error' ? [] : items.filter(filter ?? matchesText(_value))
  // Nothing at all to say (no text, no suggestions, nothing pending): keep the
  // dropdown hidden rather than open an empty bordered sliver.
  const nothingToShow = filteredOptions.length === 0 && status === 'idle' && !query

  // The clear button wins once there is text; with an empty field the
  // spinner shows while the default suggestions load (first visit, or right
  // after clearing).
  let rightSection: ReactNode = loading ? <Loader size="xs" aria-hidden /> : null
  if (_value) {
    rightSection = (
      <ClearSearchButton
        onClear={() => {
          // Through `handleChange`, so the owner's query resets too and the
          // default results come back.
          handleChange('')
          combobox.openDropdown()
        }}
      />
    )
  }

  return (
    // The animated border wraps the whole combobox, not the input: the
    // input itself must be the combobox target, so it carries `aria-expanded`
    // and `aria-controls` and screen readers announce the result list. The
    // dropdown renders in a portal, so the border only frames the field.
    // Clipped root: the border's moving head is a blurred 128px glow that
    // travels the outline, and a mask hides only its paint, not its layout
    // overflow, so at the right end it pushed the page past the viewport and
    // scrollbars blinked in and out. The clip sits on the root with a 12px
    // margin, which keeps the visible glow (clipping the masked border layer
    // itself erased the trail) and stays inside the page's side gutter.
    <BorderAnimate
      radius="xl"
      borderWidth="sm"
      size="sm"
      duration={4}
      classNames={{ root: 'overflow-clip [overflow-clip-margin:0.75rem]' }}
    >
      {/* The results float over the page (on the navigator, over the start
          cards): a medium shadow lifts the list off what lies beneath it. */}
      <Combobox
        shadow="md"
        {...props}
        store={combobox}
        offset={0}
        // The list never runs under the phone's tab bar: floating-ui's `size`
        // gives the room left below the field, and the bar's height (Mantine's
        // global `--app-shell-footer-offset`, 0 where there is no bar) and a
        // small margin come off it. The list scrolls inside past that.
        middlewares={{
          flip: true,
          shift: true,
          size: {
            apply: ({ availableHeight, elements }) => {
              elements.floating.style.maxHeight = `calc(${availableHeight}px - var(--app-shell-footer-offset, 0rem) - var(--mantine-spacing-xs))`
            },
          },
        }}
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
            rightSection={rightSection}
            rightSectionPointerEvents="all"
            // Search terms are names and places, not prose: no red squiggles.
            spellCheck={false}
            autoComplete="off"
            // The search's violet edge as theme tokens (it was CSS `purple`):
            // violet.7 on the light field, violet.4 on the dark one, both
            // above the 3:1 a control's boundary needs. Set as the input's
            // own border variable (declared on the wrapper), not as a second
            // border around the root: one edge, and focus still turns it to
            // the primary color.
            classNames={{
              wrapper:
                '[--input-bd:light-dark(var(--mantine-color-violet-7),var(--mantine-color-violet-4))]',
            }}
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
          className="overflow-y-auto overscroll-contain"
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
            {/* Rows split by hairline dividers (decorative, hidden from screen
                readers: the listbox already counts its options). `group` lets
                the row's arrow show on hover and on the keyboard-selected
                option alike. The order is the server's relevance order: no
                grouping by kind, which would push a better match down. */}
            {filteredOptions.map((item, index) => (
              <Fragment key={item.href}>
                {index > 0 && <Divider aria-hidden />}
                <ComboboxOption value={item.href} className="group py-(--mantine-spacing-xs)">
                  <ResultRow
                    item={item}
                    nearKm={origin && item.point ? nearKm(origin, item.point) : null}
                  />
                </ComboboxOption>
              </Fragment>
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

/**
 * How each kind's thumbnail is cut, so the type reads from the picture's
 * shape before any text (as music apps tell artists from albums): a museum
 * is a round seal ringed in its own color, a work a sharp-cornered canvas,
 * a tour and a content soft tiles, the tour with the deck's gradient foot
 * line. The icon only shows on the placeholder tile of a document without
 * a picture, where it keeps the kind readable.
 */
const KIND_THUMB = {
  tour: { shape: 'rounded-md', Icon: RouteIcon },
  content: { shape: 'rounded-md', Icon: BookOpen },
  museum: { shape: 'rounded-full', Icon: Landmark },
  object: { shape: 'rounded-none', Icon: Shapes },
  user: { shape: 'rounded-full', Icon: UserRound },
} as const

/** The distance to a point when it is within `NEAR_KM`, else null. */
function nearKm(origin: { latitude: number; longitude: number }, point: MuseumPoint) {
  const km = distanceKm(origin, point)
  return km <= NEAR_KM ? km : null
}

/**
 * The row's leading picture, 48px, cut per kind (`KIND_THUMB`). Decorative:
 * the kind is also written in the row's meta line. A missing or broken
 * picture falls back to the shared placeholder surface (`PLACEHOLDER_SURFACE`)
 * with the kind's icon, so rows never change height or lose their type.
 */
function ResultThumb({ item }: { item: AutoCompleteItem }) {
  const { shape, Icon } = KIND_THUMB[item.kind]
  const [failed, setFailed] = useState(false)
  const src = failed ? undefined : item.imageUrl
  return (
    <div
      aria-hidden
      className={`relative size-12 shrink-0 overflow-hidden ${shape}`}
      // A museum's ring in its palette color, as its outline in the museum
      // switch and on the museums rail; detached by a 2px gap.
      style={
        item.kind === 'museum' && item.color
          ? { outline: `2px solid ${item.color}`, outlineOffset: 2 }
          : undefined
      }
    >
      {src ? (
        // Mantine's Image, as on the tour deck's covers (already the `card` size).
        <Image
          src={src}
          alt=""
          fit="cover"
          h="100%"
          w="100%"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div style={PLACEHOLDER_SURFACE} className="flex size-full items-center justify-center">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      {/* The tour deck's gradient foot line, scaled to the tile: a tour
          reads as a tour here as it does in the carousels. */}
      {item.kind === 'tour' && <span className="bg-tour absolute inset-x-0 bottom-0 h-[3px]" />}
    </div>
  )
}

/**
 * The "where it goes" arrow: shown only on the hovered or keyboard-selected
 * row (`group` on the option), nudging in from the left. In the row's own
 * text color: the selected option is filled with the primary color, where a
 * primary-colored arrow would vanish. Chosen in live mode
 * over a worded hint ("Open the tour"), which crowded the row.
 */
const GO_ARROW_CLASS =
  'shrink-0 text-current opacity-0 -translate-x-1 transition-[opacity,translate] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-data-combobox-selected:translate-x-0 group-data-combobox-selected:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none'

/**
 * One result (its look chosen in a live-mode session). Everything
 * is plain text and badges, no nested controls: the whole option is the
 * action (it opens the detail page), so no row carries an "open" label. The
 * kind leads the meta line in full-strength bold, readable at a glance in
 * every language, while the thumbnail's cut repeats it visually.
 */
function ResultRow({ item, nearKm }: { item: AutoCompleteItem; nearKm: number | null }) {
  const { t, i18n } = useTranslation('search')
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
    nearKm !== null ||
    item.seconds !== undefined ||
    item.difficulty !== undefined ||
    item.stops !== undefined ||
    item.priceCents !== undefined
  return (
    <Group gap="sm" wrap="nowrap" align="center" className="relative">
      <ResultThumb item={item} />
      {/* Without badges the arrow sits over the row's end: keep text clear of it. */}
      <Stack gap={4} miw={0} flex={1} className={hasDetails ? undefined : 'pe-5'}>
        <Group gap={6} wrap="nowrap" align="flex-start">
          <Text fw={600} lh={1.3}>
            {item.title}
          </Text>
          {/* Paid at a glance, beside the title; the price badge below says how much. */}
          {item.priceCents !== undefined && <PaidMark />}
        </Group>
        {/* The meta line opens with the kind in words (the thumbnail's shape
            only hints at it), then where it is: "Tour · Pinacoteca · Bologna".
            The kind in the title's color, not dimmed, so it reads first. A
            museum's city comes before its description: the line is clamped,
            and the city (often what was searched) must not be cut off. */}
        <Text size="xs" c="dimmed" lineClamp={1}>
          <Text span inherit fw={700} c="bright">
            {kindLabel}
          </Text>
          {[item.city && !item.subtitle?.includes(item.city) ? item.city : null, item.subtitle]
            .filter(Boolean)
            .map((part) => ` · ${part}`)
            .join('')}
        </Text>
        {hasDetails && (
          // The essentials for choosing: near you first (it can decide the
          // visit on its own), then time and difficulty; the arrow closes
          // this line, so it never squeezes the title or the meta line.
          <Group gap={4} wrap="nowrap" align="center">
            <Group gap={4}>
              {nearKm !== null && (
                // Icon + words + distance, never color alone; the navigation
                // icon and rounding of the museums rail's distance
                // (`MuseumRailCard`), in the primary color of a way to go.
                <Badge size="xs" variant="light" leftSection={<Navigation size={10} aria-hidden />}>
                  {t('Near you · {{distance}}', {
                    // One decimal: within NEAR_KM, whole kilometres say too little.
                    distance: formatUnit(Math.round(nearKm * 10) / 10, 'kilometer', i18n.language),
                  })}
                </Badge>
              )}
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
            <ArrowRight size={14} aria-hidden className={`ms-auto ${GO_ARROW_CLASS}`} />
          </Group>
        )}
      </Stack>
      {/* No badges (a museum, a work): no extra line just for the arrow,
          which sits at the row's end instead, centred. */}
      {!hasDetails && (
        <ArrowRight
          size={14}
          aria-hidden
          className={`absolute inset-y-0 end-0 my-auto ${GO_ARROW_CLASS}`}
        />
      )}
    </Group>
  )
}
