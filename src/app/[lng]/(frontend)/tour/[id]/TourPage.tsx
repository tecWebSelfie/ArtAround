'use client'

import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { DIFFICULTY_LABEL_KEY } from '@/components/mantine/DifficultyBadge'
import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { useCheckout } from '@/components/payments/useCheckout'
import { filterPopulated } from '@/lib/isPopulated'
import { formatPrice } from '@/lib/price'
import type { Content, Difficulty, Tour } from '@/payload-types'
import {
  Affix,
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Timeline,
  TimelineItem,
  Title,
  UnstyledButton,
  type ComboboxItem,
} from '@mantine/core'
import IsoCodes from 'iso-639-1'
import {
  Check,
  ChevronRight,
  Clock,
  Compass,
  LogIn,
  Pencil,
  Replace,
  Search,
  ShoppingBag,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const QUICK_LANGUAGES = ['en', 'it', 'fr', 'es', 'de'].filter((code) => IsoCodes.validate(code))
const MORE_LANGUAGES_VALUE = '__more-languages__'

// Language code (ISO 639-1) → country code for the flag. Flagpack ships
// country flags, not language flags, so there is no 1:1 mapping (`en` → GB
// is a judgment call). To render real flags: `pnpm add mantine-flagpack`,
// `import 'mantine-flagpack/styles.css'` at the app root, then map e.g.
// `GB → GBFlag` from 'mantine-flagpack' here and render it when present.
const FLAG_COUNTRY: Record<string, string> = {
  en: 'GB',
  it: 'IT',
  fr: 'FR',
  es: 'ES',
  de: 'DE',
}

function LocaleFlag({ code }: { code: string }) {
  const country = FLAG_COUNTRY[code] ?? code.toUpperCase()
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-sm bg-gray-200 text-[10px] font-bold uppercase text-gray-700"
    >
      {country}
    </span>
  )
}

function languageLabel(code: string) {
  const name = IsoCodes.getName(code)
  return name ? `${name} (${code.toUpperCase()})` : code.toUpperCase()
}

const DIFFICULTY_OPTIONS: ComboboxItem[] = (Object.keys(DIFFICULTY_LABEL_KEY) as Difficulty[]).map(
  (value) => ({ value, label: DIFFICULTY_LABEL_KEY[value] }),
)

type TourPageProps = {
  tour: Tour
  /** Sum (euro cents) of the contents the visitor cannot read yet; 0 = nothing to buy. */
  price: number
  lockedContentIds: string[]
  isSignedIn: boolean
  /** Payload's verdict on `tours.update` for this visitor (author or super admin). */
  canEdit: boolean
  /** `tours.delete`: the author, or the director of the tour's museum. */
  canDelete?: boolean
}

/**
 * Tour details: the ordered contents, per-content reading preferences, and
 * the two exits of the page — start navigating right away, or deal with the
 * locked contents (buy them all, or swap them for others in the tour editor).
 */
export default function TourPage({
  tour,
  price,
  lockedContentIds,
  isSignedIn,
  canEdit,
  canDelete = false,
}: TourPageProps) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const contents = filterPopulated(tour.contents)
  const locked = new Set(lockedContentIds)
  // Authors edit their tour; anyone else customizes a copy of it.
  const editHref = (
    canEdit ? `/${lng}/tour/${tour.id}/edit` : `/${lng}/tour/new?from=${tour.id}`
  ) as Route

  return (
    <Stack justify="space-between" className="my-5">
      <Title order={2} size="h2" className="text-center">
        {tour.title}
      </Title>
      {canDelete && (
        <Group justify="center">
          <DeleteDocumentButton
            collection="tours"
            id={tour.id}
            name={tour.title}
            redirectTo={`/${lng}/navigator` as Route}
          />
        </Group>
      )}
      <Timeline>
        {contents.map((content) => (
          // TimelineItem must stay a direct child of Timeline: Timeline
          // detects the opposite layout via `child.props.opposite` and
          // injects __align/__active into direct children only. Wrapping it
          // in another component silently disables the side-by-side layout.
          <TimelineItem key={content.id} opposite={<ContentOptions content={content} />}>
            <ContentCard content={content} locked={locked.has(content.id)} />
          </TimelineItem>
        ))}
      </Timeline>
      <Affix className="w-full">
        <Group justify="center" className="w-11/12">
          {price > 0 ? (
            <Button
              color="orange"
              autoContrast
              rightSection={<ShoppingBag size={12} />}
              onClick={() => setPurchaseOpen(true)}
            >
              {t('Unlock for {{price}}', { price: formatPrice(price, lng) })}
            </Button>
          ) : (
            <Button
              component={Link}
              href={editHref}
              color="orange"
              autoContrast
              rightSection={<Pencil size={12} />}
            >
              {canEdit ? t('Edit tour') : t('Customize tour')}
            </Button>
          )}
          {/* Always available: locked contents simply stay locked while navigating. */}
          <Button
            component={Link}
            href={`/${lng}/tour/${tour.id}/navigation` as Route}
            color="blue.8"
            autoContrast
            rightSection={
              <Group gap={0} align="end">
                <Compass size={12} />
                <ChevronRight size={12} />
              </Group>
            }
          >
            {t('Start tour')}
          </Button>
        </Group>
      </Affix>
      <PurchaseModal
        opened={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        price={formatPrice(price, lng)}
        lockedCount={locked.size}
        isSignedIn={isSignedIn}
        editHref={editHref}
        loginHref={`/${lng}/login?next=/${lng}/tour/${tour.id}` as Route}
        tourId={tour.id}
      />
    </Stack>
  )
}

/**
 * Buying a tour buys every locked content in it. The second option keeps the
 * tour free by sending the visitor to the tour editor to replace the locked
 * contents. Anonymous visitors can't buy, so they are offered sign-in instead.
 */
function PurchaseModal({
  opened,
  onClose,
  price,
  lockedCount,
  isSignedIn,
  editHref,
  loginHref,
  tourId,
}: {
  opened: boolean
  onClose: () => void
  price: string
  lockedCount: number
  isSignedIn: boolean
  editHref: Route
  loginHref: Route
  tourId: string
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const { startCheckout, loading, error } = useCheckout()
  return (
    <Modal opened={opened} onClose={onClose} title={t('Unlock this tour')} centered>
      <Stack gap="md">
        <Text size="sm">
          {t('{{count}} contents in this tour are paid. Buying the tour unlocks all of them.', {
            count: lockedCount,
          })}
        </Text>
        {isSignedIn ? (
          <>
            {/* Stripe Checkout charges for, and unlocks, exactly the contents
                still locked for this visitor (src/lib/checkout-quote.ts). */}
            <Button
              fullWidth
              leftSection={<ShoppingBag size={16} />}
              loading={loading}
              onClick={() => void startCheckout({ collection: 'tours', id: tourId, locale: lng })}
            >
              {t('Buy all for {{price}}', { price })}
            </Button>
            {error && (
              <Text size="sm" c="red" role="alert">
                {error}
              </Text>
            )}
          </>
        ) : (
          <Button fullWidth component={Link} href={loginHref} leftSection={<LogIn size={16} />}>
            {t('Sign in to buy')}
          </Button>
        )}
        <Button
          fullWidth
          variant="default"
          component={Link}
          href={isSignedIn ? editHref : loginHref}
          leftSection={<Replace size={16} />}
        >
          {t('Replace the paid contents')}
        </Button>
      </Stack>
    </Modal>
  )
}

function ContentCard({ content, locked }: { content: Content; locked: boolean }) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Title order={3} size="h5" lineClamp={2}>
            {content.title}
          </Title>
          {/* Shared with navigation search and nearby suggestions. */}
          {locked && <LockedPriceBadge price={content.price ?? 0} />}
        </Group>
        <Group justify="end">
          <Button
            component={Link}
            href={`/${lng}/content/${content.id}` as Route}
            size="compact-sm"
            variant="default"
            aria-label={t('See more about {{title}}', { title: content.title })}
          >
            {t('See more')}
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}

function ContentOptions({ content }: { content: Content }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(content.difficulty)
  const [language, setLanguage] = useState<string>('en')
  const [modalOpen, setModalOpen] = useState(false)

  const languageData: ComboboxItem[] = useMemo(() => {
    const quick = QUICK_LANGUAGES.map((code) => ({
      value: code,
      label: languageLabel(code).split(' ')[0].trim(),
    }))
    if (!quick.some((item) => item.value === language) && IsoCodes.validate(language)) {
      quick.unshift({ value: language, label: languageLabel(language) })
    }
    return [...quick, { value: MORE_LANGUAGES_VALUE, label: 'More languages…' }]
  }, [language])

  return (
    <>
      <Card shadow="sm" padding="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Group gap={4}>
            <Clock size={14} aria-hidden />
            <Text size="xs">
              {content.readingTimeMins != null ? `${content.readingTimeMins} min read` : '—'}
            </Text>
          </Group>
          <Select
            label="Difficulty"
            size="xs"
            data={DIFFICULTY_OPTIONS}
            value={difficulty}
            onChange={(value) => {
              if (value) setDifficulty(value as Difficulty)
            }}
            allowDeselect={false}
          />
          <Select
            label="Language"
            size="xs"
            data={languageData.map((item) => ({ value: item.value, label: item.label }))}
            value={language}
            onChange={(value) => {
              if (value === MORE_LANGUAGES_VALUE) {
                setModalOpen(true)
                return
              }
              if (value) setLanguage(value)
            }}
            allowDeselect={false}
            renderOption={({ option }) =>
              option.value === MORE_LANGUAGES_VALUE ? (
                <Group gap="xs" justify="space-between" className="w-full">
                  <Text size="sm">More languages…</Text>
                  <ChevronRight size={14} aria-hidden />
                </Group>
              ) : (
                <Group gap="xs">
                  <LocaleFlag code={option.value} />
                  <Text size="sm">{option.label}</Text>
                </Group>
              )
            }
          />
        </Stack>
      </Card>
      <LanguageModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        selected={language}
        onSelect={(code) => {
          setLanguage(code)
          setModalOpen(false)
        }}
      />
    </>
  )
}

function LanguageModal({
  opened,
  onClose,
  selected,
  onSelect,
}: {
  opened: boolean
  onClose: () => void
  selected: string
  onSelect: (code: string) => void
}) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = IsoCodes.getAllCodes().map((code) => ({
      code,
      name: IsoCodes.getName(code),
      nativeName: IsoCodes.getNativeName(code),
    }))
    if (!q) return all
    return all.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nativeName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <Modal opened={opened} onClose={onClose} title="Choose language" centered>
      <Stack gap="sm">
        <TextInput
          placeholder="Search languages"
          aria-label="Search languages"
          leftSection={<Search size={14} aria-hidden />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <ScrollArea h={320}>
          <Stack gap={2}>
            {results.map((item) => (
              <UnstyledButton
                key={item.code}
                onClick={() => onSelect(item.code)}
                aria-label={`Select ${item.name}`}
                className="rounded-md px-2 py-1.5 hover:bg-gray-100"
              >
                <Group gap="sm" justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <LocaleFlag code={item.code} />
                    <Stack gap={0}>
                      <Text size="sm">{item.name}</Text>
                      <Text size="xs" c="dimmed">
                        {item.nativeName} · {item.code.toUpperCase()}
                      </Text>
                    </Stack>
                  </Group>
                  {item.code === selected && <Check size={16} aria-label="Selected language" />}
                </Group>
              </UnstyledButton>
            ))}
            {results.length === 0 && (
              <Text size="sm" c="dimmed">
                No languages found
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  )
}
