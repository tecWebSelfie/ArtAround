import { AppShellFooter, Stack } from '@mantine/core'
import NavBar from './NavBar'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav">
        <NavBar />
      </AppShellFooter>
    </>
  )
}
