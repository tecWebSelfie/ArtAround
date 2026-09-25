import {
  Stack,
  AppShell,
  AppShellFooter,
  Button,
  SimpleGrid,
  Text,
  Title,
  Autocomplete,
  Box,
  Divider,
  Group,
  Flex,
  Center,
  Container,
  StackProps,
  Overlay,
} from '@mantine/core'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Search, Amphora, Landmark, Palette, BookCopy } from 'lucide-react'
import { TypeWriterText } from '@/components/mantine/TypeWriterText'
import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { Reflection } from '@gfazioli/mantine-reflection'

export default function MantinePlayground() {
  return (
    <AppShell
      footer={{
        height: 50,
      }}
    >
      <Stack mx="xl">
        <Stack mt="10dvh">
          <Stack>
            <Center pos="relative" h="10dvh">
              <OrbitingCircles radius={135}>
                <Amphora />
                <Landmark />
                <Palette />
                <BookCopy />
              </OrbitingCircles>
              <Overlay backgroundOpacity={0}>
                <NavigationHomeTitle />
              </Overlay>
            </Center>
          </Stack>
          <NavigatorHomeSearchBar mb="xl" />
        </Stack>
        <Divider my="md" label="Or" />
        <Group wrap="nowrap" align="baseline">
          <Stack align="center">
            <QRCode value="dw" image="compass.svg" errorCorrectionLevel="H" />
            <Text ta="center">Scan tour QR to start</Text>
          </Stack>
          <Divider my="md" orientation="vertical" />
          <Stack align="center">
            <QRCode value="dw" />
            <Text ta="center" textWrap="wrap">
              Scan the QR code to start the tour
            </Text>
          </Stack>
        </Group>
      </Stack>
      <AppShellFooter component="nav">
        <SimpleGrid cols={3} className="gap-0">
          <Button>1</Button>
          <Button>1</Button>
          <Button>1</Button>
        </SimpleGrid>
      </AppShellFooter>
    </AppShell>
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

function NavigatorHomeSearchBar(props: StackProps) {
  return (
    <Stack {...props}>
      <Group ta="center" gap="xs" display="inline-block">
        <Text span>Tours made by&nbsp;</Text>
        <TypeWriterText
          fw="bolder"
          loopColors={{ creators: 'red', curators: 'green', museums: 'blue' }}
          value={['creators', 'curators', 'museums']}
          fallbackColor="gray"
        />
      </Group>
      <Reflection
        rippleStrength={30}
        rippleFrequency={0.025}
        reflectionDistance={-10}
        reflectionOpacity={0}
        reflectionStretch={0.33}
        shadowOffset={-45}
        shadowOpacity={0.2}
        shadowBlur={5.51}
        shadowSize={29}
        shadowScaleX={1.7}
        shadowScaleY={1.24}
      >
        <BorderAnimate radius="xl" borderWidth="sm" size="xl" duration={4}>
          <Autocomplete
            leftSection={<Search size={16} />}
            bd="1px solid purple"
            bdrs="xl"
            size="lg"
            radius="xl"
            w="100%"
            placeholder="Look for the next tour"
          />
        </BorderAnimate>
      </Reflection>
    </Stack>
  )
}
