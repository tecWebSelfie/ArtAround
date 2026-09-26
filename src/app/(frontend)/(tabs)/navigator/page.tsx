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
  Center,
  StackProps,
  Overlay,
  ActionIcon,
  UnstyledButton,
  Paper,
  SegmentedControl,
  SegmentedControlProps,
  Flex,
  rem,
} from '@mantine/core'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Search, Amphora, Landmark, Palette, BookCopy, Mic, Compass, Store } from 'lucide-react'
import { TypeWriterText } from '@/components/mantine/TypeWriterText'
import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { Reflection } from '@gfazioli/mantine-reflection'

export default function MantinePlayground() {
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }}>
      <Stack mt="10dvh">
        <Stack>
          <NavigationHomeTitle />
          <NavigatorHomeSearchBar mb="xl" />
        </Stack>
      </Stack>
      <Divider my="md" label="Or" />
      <Flex align="stretch" justify="center" gap={{ base: 'xs', sm: 'md' }} wrap="nowrap">
        <Center flex="1 1 0" miw={0}>
          <Paper
            type="button"
            component="button"
            p="xs"
            withBorder
            shadow="sm"
            maw="100%"
            miw={0}
          >
            <QRCode
              color="blue"
              value="dw"
              image="compass.svg"
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
