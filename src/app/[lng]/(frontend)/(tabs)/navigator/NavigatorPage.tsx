import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import {
  ActionIcon,
  Center,
  Divider,
  Flex,
  Paper,
  rem,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Route as RouteIcon, UsersRound } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { NavigatorSearch } from './NavigatorSearch'

/**
 * Navigator home: the site search (Payload `search` collection, see
 * docs/search.md), then the ways to begin a visit: scan a QR, plan a visit,
 * join a group by its code. `lng` defaults to the route's; `onNavigate` lets
 * the page keep client-side navigation and stories intercept it.
 *
 * Phones stack the group form under the QR/plan pair. From md the page sits
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
      mx={{ base: 'md', sm: 'xl', md: 'auto' }}
      maw={{ md: 1120 }}
      w={{ md: '100%' }}
      px={{ md: 'xl' }}
    >
      <Stack mt="10dvh">
        {/* The search keeps a search-sized measure on wide screens. */}
        <Stack gap="xl" w="100%" maw={{ md: 720 }} mx={{ md: 'auto' }}>
          <NavigationHomeTitle />
          <NavigatorSearch lng={lng} onNavigate={onNavigate} />
        </Stack>
      </Stack>
      <Divider
        my="md"
        label={t('Or')}
        styles={{ label: { color: 'var(--mantine-color-gray-7)' } }}
      />
      {/* One flex row for the three ways in. Below md the group form wraps to
          its own full-width line (row gap md + mt lg, as when it was a sibling
          in the Stack); from md it is the third column. */}
      <Flex
        align="stretch"
        justify="center"
        columnGap={{ base: 'xs', sm: 'md', md: 'lg' }}
        rowGap="md"
        wrap={{ base: 'wrap', md: 'nowrap' }}
      >
        <Center flex="1 1 0" miw={0}>
          {/* Opens the camera scanner (/scan). The QR drawn here is only an
              illustration of what to look for, hidden from screen readers. */}
          <Paper
            component={Link}
            href={`/${lng}/scan` as Route}
            p="xs"
            withBorder
            shadow="sm"
            maw="100%"
            miw={0}
            className="transition-shadow hover:shadow-md"
          >
            <QRCode
              aria-hidden
              color="blue"
              value="dw"
              image="/compass.svg"
              errorCorrectionLevel="H"
              size={rem('clamp(72px, 22vw, 160px)')}
            />
            <Text
              c="blue.8"
              ta="center"
              textWrap="balance"
              lineClamp={2}
              fz={{ base: 'xs', sm: 'sm' }}
              maw="100%"
            >
              {t('Scan a tour QR code to start')}
            </Text>
          </Paper>
        </Center>
        <Divider orientation="vertical" />
        <Center flex="1 1 0" miw={0}>
          {/* Plan my visit: a short form that builds a tour for the visitor's
              time, group and interests (tour/plan, /api/plan-tour). */}
          <Stack align="center" maw="100%" miw={0}>
            <ActionIcon
              component={Link}
              href={`/${lng}/tour/plan` as Route}
              autoContrast
              size={rem('clamp(72px, 22vw, 150px)')}
              variant="filled"
              className="rounded-full"
              aria-label={t('Plan my visit')}
            >
              <RouteIcon size="70%" aria-hidden />
            </ActionIcon>
            <Text
              ta="center"
              textWrap="balance"
              lineClamp={2}
              fz={{ base: 'xs', sm: 'sm' }}
              maw="100%"
            >
              {t('Or plan a visit around your time and interests')}
            </Text>
          </Stack>
        </Center>
        <Divider orientation="vertical" visibleFrom="md" />
        {/* Group tours: the code a friend or teacher gives out (JoinGroupForm → /room/{code}). */}
        <Center flex={{ base: '1 1 100%', md: '1 1 0' }} miw={0} mt={{ base: 'lg', md: 0 }}>
          <Stack align="center" gap="md">
            {/* Desktop only: gives the third way in the same visual weight as
                the QR and the plan icon beside it. Decorative: the form's own
                label says what it does. */}
            <ThemeIcon
              visibleFrom="md"
              variant="light"
              radius="xl"
              size={rem(150)}
              className="rounded-full"
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
