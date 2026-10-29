import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import {
  Box,
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
import { Route as RouteIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { NavigatorSearch } from './NavigatorSearch'

/**
 * Side of the QR and of the Plan circle: the same, so the two cards match.
 * About half the viewport minus the page margin, row gaps, divider and card
 * padding (~56px), so each card nearly fills its half of the row on a phone;
 * capped so it stays a card, not a poster, on wide screens.
 */
const START_VISUAL_SIZE = 'clamp(72px, calc(50vw - 56px), 200px)'
/** The bordered card both ways to start a visit share. */
const START_CARD = {
  p: 'xs',
  withBorder: true,
  shadow: 'sm',
  w: 'min-content',
  maw: '100%',
  // Both cards take the row's height, so captions of different lengths
  // don't leave one card shorter than the other.
  h: '100%',
  className: 'transition-shadow hover:shadow-md',
} as const

/**
 * Navigator home: the site search (Payload `search` collection, see
 * docs/search.md), then the two ways to start a visit (QR, Plan my visit) and
 * the group code form. `lng` defaults to the route's; `onNavigate` lets the page
 * keep client-side navigation and stories intercept it.
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
    <Stack mx={{ base: 'md', sm: 'xl' }}>
      <Stack mt="10dvh">
        <Stack gap="xl">
          <NavigationHomeTitle />
          <NavigatorSearch lng={lng} onNavigate={onNavigate} />
        </Stack>
      </Stack>
      <Divider
        my="md"
        label={t('Or')}
        styles={{ label: { color: 'var(--mantine-color-gray-7)' } }}
      />
      {/* Two twin cards either side of the divider: same border, shadow and
          size. `w="min-content"` lets the square visual set each card's width,
          so the caption wraps under it instead of stretching the card. Captions
          use the body text colour, not blue: the visuals already carry the
          accent and blue text read too low-contrast on the white card. */}
      <Flex align="stretch" justify="center" gap={{ base: 'xs', sm: 'md' }} wrap="nowrap">
        <Center flex="1 1 0" miw={0}>
          {/* Opens the camera scanner (/scan). The QR drawn here is only an
              illustration of what to look for, hidden from screen readers. */}
          <Paper component={Link} href={`/${lng}/scan` as Route} {...START_CARD}>
            <Stack gap="xs" align="center">
              <QRCode
                aria-hidden
                color="blue"
                value="dw"
                image="/compass.svg"
                errorCorrectionLevel="H"
                size={rem(START_VISUAL_SIZE)}
              />
              <Text c="var(--mantine-color-text)" ta="center" textWrap="balance" fz={{ base: 'xs', sm: 'sm' }}>
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
            <Stack gap="xs" align="center">
              <ThemeIcon
                autoContrast
                size={rem(START_VISUAL_SIZE)}
                variant="filled"
                radius="100%"
                aria-hidden
              >
                <RouteIcon size="60%" aria-hidden />
              </ThemeIcon>
              <Text c="var(--mantine-color-text)" ta="center" textWrap="balance" fz={{ base: 'xs', sm: 'sm' }}>
                {t('Or plan a visit around your time and interests')}
              </Text>
            </Stack>
          </Paper>
        </Center>
      </Flex>
      {/* Group tours: the code a friend or teacher gives out (JoinGroupForm → /room/{code}). */}
      <Box mt="lg">
        <JoinGroupForm />
      </Box>
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
