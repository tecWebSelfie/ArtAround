import { QRCode } from '@gfazioli/mantine-qr-code'
import { ActionIcon, Center, Divider, Flex, Paper, rem, Stack, Text, Title } from '@mantine/core'
import { Mic } from 'lucide-react'
import { NavigatorSearch } from './NavigatorSearch'

export default function NavigatorHomePage({ lng }: { lng: string }) {
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }}>
      <Stack mt="10dvh">
        <Stack gap="xl">
          <NavigationHomeTitle />
          <NavigatorSearch lng={lng} />
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
          <Stack align="center" maw="100%" miw={0}>
            <ActionIcon
              autoContrast
              size={rem('clamp(72px, 22vw, 150px)')}
              variant="filled"
              className="rounded-full"
              aria-label="Turn the microphone on"
            >
              <Mic size="80%" />
            </ActionIcon>
            <Text
              ta="center"
              textWrap="balance"
              lineClamp={2}
              fz={{ base: 'xs', sm: 'sm' }}
              maw="100%"
            >
              Or turn the mic on and tell us what you want
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
