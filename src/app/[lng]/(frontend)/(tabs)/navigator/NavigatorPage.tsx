import { ArtAroundGlobalSearch, AutoCompleteItem } from '@/components/mantine/ArtAroundGlobalSearch'
import { TypeWriterText } from '@/components/mantine/TypeWriterText'
import { mockContentSecond } from '@/mocks/content.mock'
import { mockTourThird } from '@/mocks/tour.mock'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Reflection } from '@gfazioli/mantine-reflection'
import {
  ActionIcon,
  Box,
  Center,
  ComboboxProps,
  Divider,
  Flex,
  Group,
  Paper,
  rem,
  Stack,
  StackProps,
  Text,
  Title,
} from '@mantine/core'
import { Route as RouteIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export default function NavigatorHomePage({
  onOptionSubmit,
}: {
  onOptionSubmit?: ComboboxProps['onOptionSubmit']
}) {
  const { t } = useTranslation('plan-visit')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }}>
      <Stack mt="10dvh">
        <Stack gap="xl">
          <NavigationHomeTitle />
          <NavigatorHomeSearchBar
            items={[
              { kind: 'content', content: mockContentSecond, key: mockContentSecond.id },
              { kind: 'tour', tour: mockTourThird, key: mockTourThird.id },
            ]}
            onOptionSubmit={onOptionSubmit}
          />
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

export function NavigatorHomeSearchBar({
  items,
  onOptionSubmit,
  ...props
}: { items: AutoCompleteItem[]; onOptionSubmit: ComboboxProps['onOptionSubmit'] } & StackProps) {
  return (
    <Stack {...props}>
      <Group ta="center" gap="xs" display="inline-block">
        <Text span>Tours made by&nbsp;</Text>
        <Box miw="9ch" display="inline-block" ta="left">
          <TypeWriterText
            fw="bolder"
            loopColors={{ creators: 'red.8', curators: 'green.8', museums: 'blue.8' }}
            value={['creators', 'curators', 'museums']}
            fallbackColor="gray"
          />
        </Box>
      </Group>
      <Reflection
        rippleStrength={30}
        rippleFrequency={0.025}
        reflectionDistance={-10}
        reflectionOpacity={0}
        reflectionStretch={0.33}
        shadowOffset={-50}
        shadowOpacity={0.2}
        shadowBlur={5.51}
        shadowSize={29}
        shadowScaleX={1}
        shadowScaleY={1.24}
      >
        <ArtAroundGlobalSearch items={items} onOptionSubmit={onOptionSubmit} />
      </Reflection>
    </Stack>
  )
}
