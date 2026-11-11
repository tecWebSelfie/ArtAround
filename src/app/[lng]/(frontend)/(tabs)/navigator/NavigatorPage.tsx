import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Box, Center, Divider, Flex, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { Route as RouteIcon, UsersRound } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trans, useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
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
      component="main"
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

/**
 * The title's one accented phrase (DESIGN.md → Gradient-Span Rule), kept on
 * one line. "Around art" echoes the app's name, so the brand stays in the
 * title without the title being only the brand.
 */
function TitleAccent({ children }: { children?: ReactNode }) {
  return (
    <Text
      span
      inherit
      variant="gradient"
      // Theme tokens per scheme (it was blue → CSS `purple`, about 1.6:1 at
      // its dark end on a dark page): blue.7 → violet.7 on light, the .4
      // shades on dark, each end above the 3:1 large text needs.
      gradient={{
        from: 'light-dark(var(--mantine-color-blue-7), var(--mantine-color-blue-4))',
        to: 'light-dark(var(--mantine-color-violet-7), var(--mantine-color-violet-4))',
      }}
      className="whitespace-nowrap"
    >
      {children}
    </Text>
  )
}

/**
 * The home's h1 and the line under it. The title names the visitor's task
 * ("Find your way around art") instead of a slogan, and is the page's one
 * bold move: display size, heavy weight, tight leading, fluid between phone
 * and desktop (`clamp`), with no motion around it. The line under it says
 * who makes the tours and the promise that sets ArtAround apart, the visit
 * adapting to the visitor. Both wrap between words and balance their lines.
 */
function NavigationHomeTitle() {
  const { t } = useTranslation('plan-visit')
  return (
    <Stack gap="xs" align="center">
      <Title
        ta="center"
        order={1}
        textWrap="balance"
        size="clamp(2.25rem, 1.5rem + 3.2vw, 3.75rem)"
        fw={800}
        lh={1.08}
        className="tracking-[-0.02em]"
      >
        {/* Children: what renders without an i18next instance (Storybook);
            with one, the translation of `i18nKey` replaces them. */}
        <Trans
          t={t}
          i18nKey="Find your way <accent>around art</accent>"
          // Named tags as the English value: from the children alone the
          // extractor would write `<1>` placeholders into en.json.
          defaults="Find your way <accent>around art</accent>"
          components={{ accent: <TitleAccent /> }}
        >
          Find your way <TitleAccent>around art</TitleAccent>
        </Trans>
      </Title>
      {/* Hidden on short screens: there the start cards need the height
          (the phone home fits one screen), and the title already says it. */}
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
