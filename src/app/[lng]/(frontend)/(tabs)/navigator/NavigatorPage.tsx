import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import {
  Box,
  Center,
  Divider,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { ChevronRight, Route as RouteIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trans, useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { APP_NAME } from '@/lib/app-name'
import { BRAND_GRADIENT } from '@/theme'
import { NavigatorSearch } from './NavigatorSearch'

/** The bordered card both ways to start a visit share. */
const START_CARD = {
  p: 'xs',
  withBorder: true,
  shadow: 'sm',
  radius: 'lg',
  // Phones: the card fills its half of the row, so a visual shrunk by a short
  // screen leaves the caption its width. From md both cards share one width
  // (15rem, a little wider than the largest visual), so the pair stays twin
  // and a visual shrunk by a short window doesn't narrow its caption.
  maw: '100%',
  // Both cards take the row's height, so captions of different lengths
  // don't leave one card shorter than the other.
  h: '100%',
  // Below md each card is a width container (`@container`) for its visual's
  // size (StartVisual). In fit mode a card squeezed past its content clips
  // rather than spill onto the group form. `mantine-focus-auto` gives the
  // card link Mantine's keyboard focus ring (a Paper rendered as a Link had
  // none). Hover and focus lift it and turn its edge to the primary color:
  // the card is one big button and should answer like one.
  className:
    'group/start mantine-focus-auto w-full from-md:w-[15rem] transition-[box-shadow,border-color] hover:shadow-md hover:border-(--mantine-primary-color-filled) focus-visible:shadow-md below-md:@container fit-screen:overflow-hidden',
} as const

/**
 * The card's call to action: a light-primary bar with a chevron, so the card
 * reads as a button at a glance (a plain caption under the picture read as a
 * label, not something to press). Not a nested control: the whole card is
 * the link, and this text is its accessible name.
 */
function StartAction({ children }: { children: ReactNode }) {
  return (
    <Group
      gap={4}
      wrap="nowrap"
      justify="center"
      w="100%"
      px="xs"
      py={6}
      bdrs="md"
      bg="var(--mantine-primary-color-light)"
      c="var(--mantine-primary-color-light-color)"
      className="transition-colors group-hover/start:bg-(--mantine-primary-color-light-hover)"
    >
      <Text inherit ta="center" textWrap="balance" fw={600} fz={{ base: 'xs', sm: 'sm' }}>
        {children}
      </Text>
      <ChevronRight size={16} aria-hidden className="shrink-0" />
    </Group>
  )
}

/**
 * Below md the card body is a grid: the visual's row is at most a square as
 * wide as the card (`--start-visual`, the page's 12.5rem cap), the caption
 * row under it. With room the visual takes that maximum; squeezed (fit mode)
 * it gives way first and the caption keeps its lines. Spare height centres
 * the two; the column spans the card (not the caption's width).
 */
const CARD_BODY_CLASS =
  'below-md:grid below-md:grid-rows-[minmax(0,min(100cqw,var(--start-visual)))_auto] below-md:content-center below-md:justify-stretch'

/**
 * Holds a card's visual. Below md it fills its grid cell as a size container,
 * so the cell's height never depends on the visual, and the visual is the
 * largest square that fits (`100cqmin`). From md a plain centred box.
 */
function StartVisual({ children }: { children: React.ReactNode }) {
  return (
    <Center className="below-md:size-full below-md:[--start-visual:100cqmin] below-md:[container-type:size]">
      {children}
    </Center>
  )
}

/**
 * Navigator home: the site search (Payload `search` collection, see
 * docs/search.md), then the ways to begin a visit: scan a QR, plan a visit,
 * join a group by its code. `lng` defaults to the route's; `onNavigate` lets
 * the page keep client-side navigation and stories intercept it.
 *
 * Two primary ways (scan a QR, plan a visit) are twin button cards; joining
 * a group is the secondary way, for the visitors a guide or teacher sent
 * here, so it sits apart at the bottom (`mt-auto`: any spare height goes
 * above it) with no picture of its own, at every size. Held upright (the
 * `fit-screen` variant, globals.css) the phone home takes exactly the height
 * between the top controls and the tab bar (size containment) and the
 * QR/Plan row shrinks to fit it; other screens scroll. From md the page sits
 * in a bounded centered column.
 */
export default function NavigatorHomePage({
  lng: lngProp,
  onNavigate,
}: {
  lng?: string
  onNavigate?: (href: string) => void
}) {
  const { t } = useTranslation('plan-visit')
  const params = useParams<{ lng: string }>()
  const lng = lngProp ?? params.lng
  return (
    <Stack
      component="main"
      // `--start-visual`: side of the QR and the Plan circle (smaller below
      // md, see StartVisual). From md it follows the window's height between
      // 8rem and 12.5rem, so on a laptop (1280×720, 1024×768) the group form
      // stays on the first screen with the cards.
      className="mx-(--mantine-spacing-md) from-sm:mx-(--mantine-spacing-xl) from-md:mx-auto from-md:w-full from-md:max-w-[70rem] from-md:px-(--mantine-spacing-xl) [--start-visual:12.5rem] from-md:[--start-visual:clamp(8rem,20dvh,12.5rem)] fit-screen:[contain:size]"
      flex={1}
      // Explicit: the spacer below cancels this gap (`--stack-gap`).
      gap="md"
    >
      {/* Space above the title: 10dvh (6dvh from md, under the site
          header); in fit mode free height up to that. A top margin that can
          flex, hence cancelling the gap after it. */}
      <Box
        aria-hidden
        className="-mb-(--stack-gap) h-[10dvh] from-md:h-[6dvh] fit-screen:max-h-[10dvh] fit-screen:min-h-(--mantine-spacing-sm) fit-screen:flex-[1_1_0]"
      />
      {/* The search keeps a search-sized measure on wide screens. */}
      <Stack gap="xl" w="100%" className="from-md:mx-auto from-md:max-w-[45rem]">
        <NavigationHomeTitle />
        <NavigatorSearch lng={lng} onNavigate={onNavigate} />
      </Stack>
      <Divider
        className="my-(--mantine-spacing-xs) from-md:my-(--mantine-spacing-md)"
        label={t('Or')}
        // The theme's readable supporting tone, in either scheme (a fixed
        // gray.7 was 1.9:1 on the dark page).
        styles={{ label: { color: 'var(--mantine-color-dimmed)' } }}
      />
      {/* QR and Plan, the two primary ways in: twin cards either side of
          the divider, same border, shadow and size. Halves of the row on
          phones; from md both share one fixed width (START_CARD), so the
          pair sits together in the middle. */}
      <Flex
        className="gap-(--mantine-spacing-xs) from-sm:gap-(--mantine-spacing-md) from-md:justify-center from-md:gap-(--mantine-spacing-lg)"
        miw={0}
        // A block's automatic minimum height is its whole content: 0 lets
        // the row shrink in fit mode (it never grows: flex 0 1 auto).
        mih={0}
        flex="0 1 auto"
      >
        <Center miw={0} className="flex-[1_1_0] from-md:flex-none">
          {/* Opens the camera scanner (/scan). The QR drawn here is only an
              illustration of what to look for, hidden from screen readers. */}
          <Paper component={Link} href={`/${lng}/scan` as Route} {...START_CARD}>
            <Stack gap="xs" align="center" justify="center" h="100%" className={CARD_BODY_CLASS}>
              <StartVisual>
                <QRCode
                  aria-hidden
                  color="museum"
                  value="dw"
                  image="/compass.svg"
                  errorCorrectionLevel="H"
                  size="var(--start-visual)"
                />
              </StartVisual>
              <StartAction>{t('Scan a tour QR code to start')}</StartAction>
            </Stack>
          </Paper>
        </Center>
        <Divider orientation="vertical" />
        <Center miw={0} className="flex-[1_1_0] from-md:flex-none">
          {/* Plan my visit: a short form that builds a tour for the visitor's
              time, group and interests (tour/plan, /api/plan-tour). The whole
              card is the link; its caption is the accessible name. */}
          <Paper component={Link} href={`/${lng}/tour/plan` as Route} {...START_CARD}>
            <Stack gap="xs" align="center" justify="center" h="100%" className={CARD_BODY_CLASS}>
              <StartVisual>
                <ThemeIcon
                  autoContrast
                  size="var(--start-visual)"
                  variant="filled"
                  radius="100%"
                  aria-hidden
                >
                  <RouteIcon size="60%" aria-hidden />
                </ThemeIcon>
              </StartVisual>
              {/* One label at every size: an "Or …" lead-in (it echoed the
                  divider on phones) reads wrong inside a button. Short, so
                  it wraps to the QR action's two lines on a phone instead of
                  three; the plan page asks about interests itself. */}
              <StartAction>{t('Plan a visit around your time')}</StartAction>
            </Stack>
          </Paper>
        </Center>
      </Flex>
      {/* Group tours, the secondary way in (the code a guide, teacher or
          friend gives out; JoinGroupForm → /room/{code}): at the bottom,
          separated from the cards by at least `xl`, plus whatever height the
          cards leave. */}
      <Center className="mt-auto pt-(--mantine-spacing-xl)">
        <JoinGroupForm />
      </Center>
    </Stack>
  )
}

/** The app's name in the home title's gradient (DESIGN.md → Gradient-Span Rule). */
function BrandName({ children }: { children?: ReactNode }) {
  return (
    <Text span inherit variant="gradient" gradient={BRAND_GRADIENT} className="whitespace-nowrap">
      {children}
    </Text>
  )
}

/**
 * The home's h1 and the line under it. The title is the brand's pun
 * ("Everything's around" / "Everything's ArtAround"): it is what people
 * remember, so it stays, at display size (fluid between phone and desktop,
 * the system sans at 700, the page's one bold move, no motion around it).
 * Puns don't translate, so the line under it carries the plain promise:
 * who makes the tours, in your language and at your pace. It wraps between
 * words and balances its lines.
 */
function NavigationHomeTitle() {
  const { t } = useTranslation('plan-visit')
  return (
    <Stack gap="xs" align="center">
      <Title
        ta="center"
        order={1}
        textWrap="balance"
        size="clamp(2.25rem, 1.6rem + 2.8vw, 3.5rem)"
        fw={700}
        lh={1.1}
        className="tracking-[-0.01em]"
      >
        {/* Children: what renders without an i18next instance (Storybook);
            with one, the translation of `i18nKey` replaces them. */}
        <Trans
          t={t}
          i18nKey="Everything’s <brand>{{name}}</brand>"
          // Named tags as the English value: from the children alone the
          // extractor would write `<1>` placeholders into en.json.
          defaults="Everything’s <brand>{{name}}</brand>"
          values={{ name: APP_NAME }}
          components={{ brand: <BrandName /> }}
        >
          Everything’s <BrandName>{APP_NAME}</BrandName>
        </Trans>
      </Title>
      {/* Hidden on short screens: there the start cards need the height
          (the phone home fits one screen). */}
      <Text
        ta="center"
        c="dimmed"
        textWrap="balance"
        maw="32rem"
        className="[@media(max-height:700px)]:hidden"
      >
        {t('Tours by museums, curators and creators, in your language and at your pace.')}
      </Text>
    </Stack>
  )
}
