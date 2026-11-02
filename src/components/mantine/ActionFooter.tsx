import {
  AppShellFooter,
  Container,
  type ContainerProps,
  type MantineBreakpoint,
} from '@mantine/core'
import type { ReactNode } from 'react'

/**
 * The fixed 64px footer that carries a page's way forward (DESIGN.md → The
 * Thumb-Reach Rule): one full-width action, or an evenly split pair, inside
 * reach of a standing visitor's thumb while the content above scrolls.
 *
 * `size` matches the page's own column, so the action lines up with the
 * text: `xs` on focused task pages (quiz, results, checkout), `sm` on detail
 * pages (tour, content). The page must render in `AppShellMain`, which
 * reserves the footer's height (`app/[lng]/(frontend)/layout.tsx`).
 * Hook-free, so server pages can render it.
 *
 * `hiddenFrom`: detail and outcome pages pass `md`. On desktop the visitor
 * browses rather than walks, so those pages render the same action inline
 * (DESIGN.md → Desktop) and the footer steps aside. Step flows (quiz) leave
 * it unset and keep the footer at every width.
 */
export function ActionFooter({
  size,
  hiddenFrom,
  children,
}: {
  size: ContainerProps['size']
  hiddenFrom?: MantineBreakpoint
  children: ReactNode
}) {
  return (
    <AppShellFooter p="xs" hiddenFrom={hiddenFrom}>
      <Container size={size} px="md">
        {children}
      </Container>
    </AppShellFooter>
  )
}
