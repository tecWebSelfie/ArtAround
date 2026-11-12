'use client'

import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { Box, Divider, Stack, Text, Title } from '@mantine/core'
import { ChevronRight, Route as RouteIcon, ScanLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Trans, useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { APP_NAME } from '@/lib/app-name'
import { BRAND_GRADIENT } from '@/theme'
import { NavigatorSearch } from './NavigatorSearch'

/**
 * Shape shared by both start blocks: icon and chevron on one line, then the
 * title and the line saying where the block leads. The whole block is one
 * link (its text is the accessible name); `mantine-focus-auto` gives it
 * Mantine's keyboard focus ring.
 */
const START_BLOCK_CLASS =
  'mantine-focus-auto flex min-w-0 flex-col gap-(--mantine-spacing-xs) rounded-(--mantine-radius-lg) px-(--mantine-spacing-md) py-(--mantine-spacing-sm) no-underline transition-[background-color,box-shadow]'

/**
 * One primary hue for both ways in: both start a tour, so color doesn't set
 * them apart (the tour gradient on one alone read as a different kind of
 * thing). The fill ranks them: Scan is the filled primary, Plan its light
 * tint. Both follow the museum's color in museum mode.
 */
const START_BLOCK_TONE = {
  filled:
    'bg-(--mantine-primary-color-filled) text-(--mantine-color-white) shadow-(--mantine-shadow-sm) hover:bg-(--mantine-primary-color-filled-hover) hover:shadow-(--mantine-shadow-md)',
  light:
    'bg-(--mantine-primary-color-light) text-(--mantine-primary-color-light-color) hover:bg-(--mantine-primary-color-light-hover)',
} as const

/** A way to start a visit, as a colored block on the start row. */
function StartBlock({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: Route
  icon: LucideIcon
  title: string
  description: string
  tone: keyof typeof START_BLOCK_TONE
}) {
  return (
    <Link href={href} className={`${START_BLOCK_CLASS} ${START_BLOCK_TONE[tone]}`}>
      <span className="flex items-center justify-between">
        <Icon size={32} aria-hidden />
        <ChevronRight size={20} aria-hidden />
      </span>
      <Text inherit fw={700} lh={1.25} textWrap="balance">
        {title}
      </Text>
      <Text inherit fz="sm" lh={1.35}>
        {description}
      </Text>
    </Link>
  )
}

/**
 * Navigator home: the site search (Payload `search` collection, see
 * docs/search.md), then the ways to begin a visit: scan a QR, plan a visit,
 * join a group by its code. `lng` defaults to the route's; search results
 * open with client-side navigation (no full page reload).
 *
 * The two primary ways (scan a QR, plan a visit) are two blocks side by side
 * on one row, at every size (StartBlock); joining a group is the secondary
 * way, for the visitors a guide or teacher sent here: a quieter form right
 * under the blocks. Search, the blocks and the form are meant to land on a
 * phone's first screen; the space above the title is what gives way when the
 * screen is short (the `fit-screen` spacer), and a screen too short for all
 * of it scrolls rather than squeeze text. From md the page sits in a bounded
 * centered column.
 *
 * `discover` (the page's `DiscoverSections`, streamed) follows the ways in:
 * the rails that hint at what the app holds, below the first screen.
 */
export default function NavigatorHomePage({
  lng: lngProp,
  discover,
}: {
  lng?: string
  discover?: ReactNode
}) {
  const { t } = useTranslation('plan-visit')
  const params = useParams<{ lng: string }>()
  const router = useRouter()
  const lng = lngProp ?? params.lng
  return (
    <Stack
      component="main"
      className="mx-(--mantine-spacing-md) from-sm:mx-(--mantine-spacing-xl) from-md:mx-auto from-md:w-full from-md:max-w-[70rem] from-md:px-(--mantine-spacing-xl)"
      flex={1}
      // Explicit: the spacer below cancels this gap (`--stack-gap`).
      gap="md"
    >
      {/* Space above the title: 10dvh (6dvh from md, under the site
          header). On an upright phone it shrinks with the screen's height,
          down to `sm` on short ones, so the ways in still land on the first
          screen: the rails below make the page scroll, so free height can no
          longer size it. It cancels the gap after it (a top margin). */}
      <Box
        aria-hidden
        className="-mb-(--stack-gap) h-[10dvh] shrink-0 from-md:h-[6dvh] fit-screen:h-[clamp(var(--mantine-spacing-sm),30dvh-11rem,10dvh)]"
      />
      {/* The search keeps a search-sized measure on wide screens. */}
      <Stack gap="xl" w="100%" className="from-md:mx-auto from-md:max-w-[45rem]">
        <NavigationHomeTitle />
        <NavigatorSearch lng={lng} onNavigate={(href) => router.push(href as Route)} />
      </Stack>
      <Divider
        className="my-(--mantine-spacing-xs) from-md:my-(--mantine-spacing-md)"
        label={t('Or')}
        // The theme's readable supporting tone, in either scheme (a fixed
        // gray.7 was 1.9:1 on the dark page).
        styles={{ label: { color: 'var(--mantine-color-dimmed)' } }}
      />
      {/* The three ways in, as one group. `lg` between the blocks and the
          group form: wider than the blocks' own `xs` gap, so the form reads
          as a tier of its own, and still closer than the "Or" rule, so the
          three stay together. */}
      <Stack gap="lg" w="100%" className="mx-auto max-w-[45rem]">
        {/* Scan and Plan, the two primary ways in: halves of one row, within
            the search's measure on wide screens. Scan opens the camera scanner
            (/scan); Plan my visit is a short form that builds a tour for the
            visitor's time, group and interests (tour/plan, /api/plan-tour). */}
        <div className="grid grid-cols-2 gap-(--mantine-spacing-xs)">
          <StartBlock
            href={`/${lng}/scan` as Route}
            icon={ScanLine}
            tone="filled"
            title={t('Scan a tour QR code to start')}
            description={t(
              'At the museum? Point the camera at the code by the entrance or next to a work',
            )}
          />
          <StartBlock
            href={`/${lng}/tour/plan` as Route}
            icon={RouteIcon}
            tone="light"
            title={t('Plan a visit around your time')}
            description={t('Tell us how much time you have and what you like: we build the route')}
          />
        </div>
        {/* Group tours, the secondary way in (the code a guide, teacher or
            friend gives out; JoinGroupForm → /room/{code}). */}
        <JoinGroupForm />
      </Stack>
      {/* The discover rails: a section of their own, so more space above
          them than the ways in keep between themselves, and room below the
          last one before the tab bar. Full column width: the rails show
          more cards per view on wide screens than the 720px measure would. */}
      {discover && (
        <Box w="100%" className="mt-(--mantine-spacing-xl) pb-(--mantine-spacing-xl)">
          {discover}
        </Box>
      )}
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
