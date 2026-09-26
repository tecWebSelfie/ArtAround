import {
  SegmentedControl,
  type SegmentedControlProps,
  Group,
  Text,
  AppShellFooter,
  Center,
  Container,
  Stack,
} from '@mantine/core'
import { Compass, Store } from 'lucide-react'

export default function MantinePlayground({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav">
        <Container>
          <NavBar />
        </Container>
      </AppShellFooter>
    </>
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
