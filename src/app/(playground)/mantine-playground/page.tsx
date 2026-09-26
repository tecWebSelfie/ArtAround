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
  ActionIcon,
  UnstyledButton,
  Paper,
  SegmentedControl,
  SegmentedControlProps,
} from '@mantine/core'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Search, Amphora, Landmark, Palette, BookCopy, Mic, Compass, Store } from 'lucide-react'
import { TypeWriterText } from '@/components/mantine/TypeWriterText'
import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { Reflection } from '@gfazioli/mantine-reflection'

export default function MantinePlayground() {
  return (
    <AppShell
      footer={{
        height: 'auto',
      }}
    >
      <Stack mx="xl">
        <Stack mt="10dvh">
          <Stack>
            <NavigationHomeTitle />
            <NavigatorHomeSearchBar mb="xl" />
          </Stack>
        </Stack>
        <Divider my="md" label="Or" />
        <Group color="blue" wrap="wrap" align="start">
          <Paper type="button" component="button" p="xs" withBorder shadow="sm">
            <QRCode color="blue" value="dw" image="compass.svg" errorCorrectionLevel="H" />
            <Text color="blue" ta="center">
              Scan tour QR to start
            </Text>
          </Paper>
          <Divider my="md" orientation="vertical" />
          <Stack align="center">
            <ActionIcon autoContrast size={150} variant="filled" className="rounded-full">
              <Mic size="80%" />
            </ActionIcon>
            <Text ta="center" textWrap="wrap">
              Scan the QR code to start the tour
            </Text>
          </Stack>
        </Group>
      </Stack>
      <AppShellFooter component="nav">
        <Container>
          <NavBar />
        </Container>
      </AppShellFooter>
    </AppShell>
  )
}

function NavBar(props: Omit<SegmentedControlProps, 'data'>) {
  return (
    <SegmentedControl
      {...props}
      autoContrast
      fullWidth
      data={[
        {
          value: 'marketplace',
          label: (
            <Center style={{ gap: 10 }}>
              <Group gap={6} align="center" justify="center">
                <Store size={16} />
                <Text color="red">Marketplace</Text>
              </Group>
            </Center>
          ),
        },
        {
          value: 'navigator',
          label: (
            <Center style={{ gap: 10 }}>
              <Group gap={6} align="center" justify="center">
                <Compass size={16} />
                <Text>Navigator</Text>
              </Group>
            </Center>
          ),
        },
      ]}
    />
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
        <Box miw="9ch" display="inline-block" ta="left">
          <TypeWriterText
            fw="bolder"
            loopColors={{ creators: 'red', curators: 'green', museums: 'blue' }}
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
        <BorderAnimate radius="xl" borderWidth="sm" size="sm" duration={4}>
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
