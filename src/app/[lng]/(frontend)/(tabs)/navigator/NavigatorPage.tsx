import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { QRCode } from '@gfazioli/mantine-qr-code'
import {
  ActionIcon,
  Box,
  Center,
  Divider,
  Flex,
  Paper,
  rem,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Route as RouteIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { NavigatorSearch } from './NavigatorSearch'

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
      <Divider my="md" label="Or" styles={{ label: { color: 'var(--mantine-color-gray-7)' } }} />
      <Flex align="stretch" justify="center" gap={{ base: 'xs', sm: 'md' }} wrap="nowrap">
        <Center flex="1 1 0" miw={0}>
          <Paper type="button" component="button" p="xs" withBorder shadow="sm" maw="100%" miw={0}>
            <QRCode
              color="blue"
              value="dw"
              image="/compass.svg"
              errorCorrectionLevel="H"
              size={rem('clamp(72px, 22vw, 160px)')}
            />
            <Text
              color="blue"
              ta="center"
              textWrap="balance"
              lineClamp={2}
              fz={{ base: 'xs', sm: 'sm' }}
              maw="100%"
            >
              Scan tour QR to start
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
