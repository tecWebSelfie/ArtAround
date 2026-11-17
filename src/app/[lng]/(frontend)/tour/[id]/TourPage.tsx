'use client'

import { TOUR_GRADIENT } from '@/theme'
import { ActionFooter } from '@/components/mantine/ActionFooter'
import { DetailCover } from '@/components/mantine/DetailCover'
import { useCheckout } from '@/components/payments/useCheckout'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { formatPrice } from '@/lib/price'
import { stopPicture, summarizeTour, withVisitableStops } from '@/lib/tour-summary'
import { tourCopyPath, tourEditPath, tourMuseumId, tourStartPath } from '@/lib/tour-navigation'
import { MuseumModeOffer } from '@/components/MuseumModeOffer'
import { BackButton } from '@/components/navigation/BackButton'
import type { Content, Difficulty, Tour } from '@/payload-types'
import {
  AppShellMain,
  Button,
  Container,
  Grid,
  GridCol,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { LogIn, Pencil, Play, Replace, ShoppingBag } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TourFigures, TourHeading, TourStops } from './TourPageParts'

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
  /** The tour's museum, for its staff: enables the printable QR download (`QrCodeButton`). */
  printMuseumId?: string | null
  /** Opened from outside the app on another museum's tour: offer that museum's app. */
  museumOffer?: { id: string; name: string } | null
  /** The server's "translating" line, while texts are on their English fallback. */
  translationNotice?: ReactNode
}

/**
 * Tour details, read before deciding to take the tour: what it is (cover,
 * museum, author, description), what it asks of the visitor (time, stops,
 * walking, access, reading difficulty, quiz) and the stops in their authored
 * order. Every figure comes from `summarizeTour`, so nothing shown here is
 * estimated by the page itself. The actions (`TourActions`): start navigating
 * when entitled, or deal with locked contents (buy them, or swap them in the
 * tour editor).
 *
 * Phones: one column, the actions in the footer within thumb reach. From `md`:
 * two panes in a 1140px container, a sticky summary on the left (cover,
 * identity, badges and the actions inline, the footer hidden) and "The stops"
 * timeline on the right.
 */
export default function TourPage({
  tour: source,
  price,
  lockedContentIds,
  isSignedIn,
  canEdit,
  canDelete = false,
  printMuseumId = null,
  museumOffer = null,
  translationNotice,
}: TourPageProps) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  // Only the stops a visitor can visit are shown (the author's editor lists all).
  const tour = withVisitableStops(source)
  const contents = filterPopulated<Content>(tour.contents)
  const locked = new Set(lockedContentIds)
  const summary = summarizeTour(tour)
  const museum = isPopulated(tour.museum) ? tour.museum : null
  const author = isPopulated(tour.author) ? tour.author.name?.fullName : null
  // A tour without its own picture borrows its first stop's (an artwork it
  // shows): a real work says more about the visit than the tour gradient.
  const cover = isPopulated(tour.thumbnail)
    ? tour.thumbnail
    : (contents.map(stopPicture).find(Boolean) ?? null)
  // Literal keys so i18next-cli keeps them (DIFFICULTY_LABEL_KEY is dynamic).
  const difficultyLabel: Record<Difficulty, string> = {
    easy: t('Easy'),
    medium: t('Medium'),
    hard: t('Hard'),
  }
  // Authors edit their tour; anyone else customizes a copy of it.
  const editHref = canEdit ? tourEditPath(lng, tour.id) : tourCopyPath(lng, tour.id)
  // The tour's start page, inside its museum's navigation.
  const startHref = tourStartPath(lng, tourMuseumId(tour), tour.id)

  return (
    <>
      <AppShellMain>
        {/* `maw` widens the `sm` container (720px) to 1140px from md only. */}
        <Container size="sm" px="md" py="md" maw={{ md: 1140 }}>
          {/* Up a level: back where the visitor came from in the app, else
              (a QR code, a shared link) the tour's museum. */}
          <BackButton
            withLanguage
            href={(museum ? `/${lng}/museum/${museum.id}` : `/${lng}/navigator`) as Route}
          />
          {/* Grid lays out with `gap`: below md (full-width columns, `lg`
              gap) it stacks exactly like the former single Stack. */}
          <Grid gap={{ base: 'lg', md: 48 }} align="flex-start">
            {/* Summary pane: sticky from md, scrolling on its own when a long
                description makes it taller than the viewport. */}
            <GridCol
              span={{ base: 12, md: 5 }}
              pos={{ md: 'sticky' }}
              top={{ md: 'var(--site-pane-top)' }}
              mah={{ md: 'var(--site-pane-height)' }}
              className="min-[62em]:overflow-y-auto"
            >
              <Stack gap="lg">
                {museumOffer && <MuseumModeOffer museum={museumOffer} />}
                {/* Always a cover, height-capped: the tour gradient stands in
                    when there is no picture, and the title and badges stay in
                    view. */}
                <DetailCover pictures={[cover]} fallback="tour" title={tour.title} />

                <TourHeading
                  tour={tour}
                  museum={museum}
                  author={author}
                  canDelete={canDelete}
                  printMuseumId={printMuseumId}
                  translationNotice={translationNotice}
                />

                <TourFigures summary={summary} isPrivate={tour.visibility === 'private'} />

                {/* The Thumb-Reach Rule: on phones the way forward lives in the
                    64px footer; from md the same pair sits inline here, right
                    under the figures and above the logistics, which can run
                    long and would push "Start tour" below the fold. */}
                <ActionFooter size="sm" inlineFrom="md">
                  <TourActions
                    price={price}
                    editHref={editHref}
                    canEdit={canEdit}
                    startHref={summary.stops > 0 ? startHref : null}
                    onUnlock={() => setPurchaseOpen(true)}
                  />
                </ActionFooter>

                {/* The visit's practical information (entrance, tickets,
                    cloakroom): logistic directions, not a stop (src/lib/tour-logistics.ts). */}
                {tour.logistics?.trim() && (
                  <Stack gap={4} component="section">
                    <Title order={2} size="h4">
                      {t('Before you go')}
                    </Title>
                    <Text size="sm" className="whitespace-pre-line">
                      {tour.logistics}
                    </Text>
                  </Stack>
                )}
              </Stack>
            </GridCol>

            <GridCol span={{ base: 12, md: 7 }}>
              <TourStops
                tour={tour}
                contents={contents}
                locked={locked}
                summary={summary}
                difficultyLabel={difficultyLabel}
              />
            </GridCol>
          </Grid>
        </Container>
      </AppShellMain>

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
    </>
  )
}

/**
 * The action buttons (`TourActions`): `md` height at least, tight padding, `sm` text,
 * and a label that may wrap (centred, tighter leading) where a translation
 * is longer than half a phone, so it grows a line instead of being cut.
 */
const FOOTER_BUTTON = {
  size: 'md',
  px: 'xs',
  fz: 'sm',
  className: 'h-auto min-h-(--button-height) py-1',
  classNames: { label: 'whitespace-normal text-center leading-tight' },
} as const

/**
 * The tour's actions, shared by the phone footer and desktop summary pane:
 * unlock or edit/customize, plus "Start tour" only for entitled readers or
 * the tour owner.
 */
function TourActions({
  price,
  editHref,
  canEdit,
  startHref,
  onUnlock,
}: {
  price: number
  editHref: Route
  canEdit: boolean
  /** `tourStartPath(…)`: the tour's start page inside its museum's navigation; null when no stop can be visited. */
  startHref: Route | null
  onUnlock: () => void
}) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  return (
    // Two equal halves of a 390px phone leave ~170px per button: tighter
    // padding and sm text keep "Customize tour" / "Unlock for €4.99" whole,
    // and a longer translation ("Muokkaa kierrosta itsellesi") wraps onto a
    // second line (`FOOTER_BUTTON`) instead of ending in "…".
    <Group grow gap="xs" wrap="nowrap" align="stretch">
      {price > 0 ? (
        <Button
          {...FOOTER_BUTTON}
          color="orange"
          autoContrast
          rightSection={<ShoppingBag size={16} />}
          onClick={onUnlock}
        >
          {t('Unlock for {{price}}', { price: formatPrice(price, lng) })}
        </Button>
      ) : (
        <Button
          {...FOOTER_BUTTON}
          component={Link}
          href={editHref}
          color="orange"
          variant="light"
          leftSection={<Pencil size={16} />}
        >
          {canEdit ? t('Edit tour') : t('Customize tour')}
        </Button>
      )}
      {/* Locked paid stops: only buying or replacing them is offered, except
          to the owner, who may walk their own tour. */}
      {price > 0 && !canEdit ? null : startHref ? (
        <Button
          {...FOOTER_BUTTON}
          component={Link}
          href={startHref}
          // The tour gradient: starting a tour is the app's main way in
          // (DESIGN.md → Colors, tour identity); moving freely stays blue.
          variant="gradient"
          gradient={TOUR_GRADIENT}
          rightSection={<Play size={16} />}
        >
          {t('Start tour')}
        </Button>
      ) : (
        // No visitable stop (the tour page says so): nothing to start.
        <Button
          {...FOOTER_BUTTON}
          disabled
          variant="gradient"
          gradient={TOUR_GRADIENT}
          rightSection={<Play size={16} />}
        >
          {t('Start tour')}
        </Button>
      )}
    </Group>
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
