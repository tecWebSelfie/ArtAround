import {
  SegmentedControl,
  type SegmentedControlProps,
  Group,
  Text,
  AppShellFooter,
  Center,
  Container,
  Stack,
  SegmentedControlItem,
} from '@mantine/core'
import { Compass, Store } from 'lucide-react'

export default function MantinePlayground({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav">
        <NavBar />
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
      data={NavBarItem([
        { label: 'Navigator', icon: <Compass size={16} /> },
        { label: 'Store', icon: <Store size={16} /> },
      ])}
    />
  )
}

const NavBarItem = (items: { label: string; icon: React.ReactNode }[]): SegmentedControlItem[] =>
  items.map((item) => ({
    value: item.label,
    label: (
      <Center style={{ gap: 10 }}>
        <Stack gap={6} align="center" justify="center">
          <Compass size={16} />
          <Text>{item.label}</Text>
        </Stack>
      </Center>
    ),
  }))
