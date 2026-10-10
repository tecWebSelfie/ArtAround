import { AppShellFooter } from '@mantine/core'

export default function TourNavigationLayout({
  navbar,
  children,
}: LayoutProps<'/[lng]/tour/[id]/navigation'>) {
  return (
    <>
      {children}
      <AppShellFooter component="nav">{navbar}</AppShellFooter>
    </>
  )
}
