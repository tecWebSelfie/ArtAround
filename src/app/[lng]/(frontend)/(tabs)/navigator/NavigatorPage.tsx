import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Box, Center, Divider, Flex, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { Route as RouteIcon, UsersRound } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { NavigatorSearch } from './NavigatorSearch'

/** The bordered card both ways to start a visit share. */
const START_CARD = {
  p: 'xs',
  withBorder: true,
  shadow: 'sm',
  // Phones: the card fills its half of the row, so a visual shrunk by a short
  // screen leaves the caption its width. From md the visual sets the width
  // (see the row below).
  maw: '100%',
  // Both cards take the row's height, so captions of different lengths
  // don't leave one card shorter than the other.
  h: '100%',
  // Below md each card is a width container (`@container`) for its visual's
  // size (StartVisual). In fit mode a card squeezed past its content clips
  // rather than spill onto the group form.
  className:
    'w-full from-md:w-min transition-shadow hover:shadow-md below-md:@container fit-screen:overflow-hidden',
} as const

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
 * Phones stack the group form under the QR/plan pair. Held upright (the
 * `fit-screen` variant, globals.css) the home takes exactly the height
 * between the top controls and the tab bar (size containment) and the
 * QR/Plan row shrinks to fit it; other screens scroll. From md the page sits
 * in a bounded centered column and the three ways become one row of equal
 * columns divided by rules, so a wide screen reads them as peers instead of
 * a phone column stranded in white space.
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
      // `--start-visual`: side of the QR, the Plan circle and the desktop
      // group icon (smaller below md, see StartVisual).
      className="mx-(--mantine-spacing-md) from-sm:mx-(--mantine-spacing-xl) from-md:mx-auto from-md:w-full from-md:max-w-[70rem] from-md:px-(--mantine-spacing-xl) [--start-visual:12.5rem] fit-screen:[contain:size]"
      flex={1}
      // Explicit: the spacer below cancels this gap (`--stack-gap`).
      gap="md"
    >
      {/* Space above the title: 10dvh; in fit mode free height up to that.
          A top margin that can flex, hence cancelling the gap after it. */}
      <Box
        aria-hidden
        className="-mb-(--stack-gap) h-[10dvh] fit-screen:max-h-[10dvh] fit-screen:min-h-(--mantine-spacing-sm) fit-screen:flex-[1_1_0]"
      />
      {/* The search keeps a search-sized measure on wide screens. */}
      <Stack gap="xl" w="100%" className="from-md:mx-auto from-md:max-w-[45rem]">
        <NavigationHomeTitle />
        <NavigatorSearch lng={lng} onNavigate={onNavigate} />
      </Stack>
      <Divider
        className="my-(--mantine-spacing-xs) from-md:my-(--mantine-spacing-md)"
        label={t('Or')}
        styles={{ label: { color: 'var(--mantine-color-gray-7)' } }}
      />
      {/* The ways in: on phones a column (the QR/Plan pair, then the group
          form); from md one row of three peers divided by rules, the pair
          taking two thirds. */}
      <Flex
        className="flex-col gap-(--mantine-spacing-md) from-md:flex-row from-md:gap-(--mantine-spacing-lg)"
        // May shrink below its content in fit mode (the cards row inside
        // gives way).
        mih={0}
      >
        {/* QR and Plan are two twin cards either side of the divider: same
            border, shadow and size. From md `w="min-content"` lets the square
            visual set each card's width, so the caption wraps under it
            instead of stretching the card. Captions use the body text colour,
            not blue: the visuals already carry the accent and blue text read
            too low-contrast on the white card. */}
        <Flex
          className="gap-(--mantine-spacing-xs) from-sm:gap-(--mantine-spacing-md) from-md:flex-[2_1_0] from-md:gap-(--mantine-spacing-lg)"
          miw={0}
          // A block's automatic minimum height is its whole content: 0 lets
          // the row shrink in fit mode (it never grows: flex 0 1 auto).
          mih={0}
        >
          <Center flex="1 1 0" miw={0}>
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
                <Text
                  c="var(--mantine-color-text)"
                  ta="center"
                  textWrap="balance"
                  fz={{ base: 'xs', sm: 'sm' }}
                >
                  {t('Scan a tour QR code to start')}
                </Text>
              </Stack>
            </Paper>
          </Center>
          <Divider orientation="vertical" />
          <Center flex="1 1 0" miw={0}>
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
                <Text
                  c="var(--mantine-color-text)"
                  ta="center"
                  textWrap="balance"
                  fz={{ base: 'xs', sm: 'sm' }}
                >
                  {/* "Or" only where the two ways stack under the "Or" rule
                      (phones); in the desktop row it would repeat the divider.
                      The hidden span is display:none, so the link's accessible
                      name is always the visible caption. */}
                  <Text span inherit hiddenFrom="md">
                    {t('Or plan a visit around your time and interests')}
                  </Text>
                  <Text span inherit visibleFrom="md">
                    {t('Plan a visit around your time and interests')}
                  </Text>
                </Text>
              </Stack>
            </Paper>
          </Center>
        </Flex>
        <Divider orientation="vertical" visibleFrom="md" />
        {/* Group tours: the code a friend or teacher gives out (JoinGroupForm → /room/{code}). */}
        <Center miw={0} className="from-md:flex-[1_1_0]">
          <Stack align="center" gap="md">
            {/* Desktop only: gives the third way in the same visual weight as
                the QR and the plan circle beside it (same size). Light, not
                filled, and no card frame: the cards are links, this column is
                a form. Decorative: the form's own label says what it does. */}
            <ThemeIcon
              visibleFrom="md"
              variant="light"
              radius="100%"
              size="var(--start-visual)"
              aria-hidden
            >
              <UsersRound size="55%" />
            </ThemeIcon>
            <JoinGroupForm />
          </Stack>
        </Center>
      </Flex>
    </Stack>
  )
}

function NavigationHomeTitle() {
  return (
    <Title ta="center" order={1}>
      Everything&apos;s&nbsp;
      <Text span inherit variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
        Artaround
      </Text>
    </Title>
  )
}
