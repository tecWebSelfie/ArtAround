import { AppShellFooter, Container, type ContainerProps } from '@mantine/core'
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
 */
export function ActionFooter({
  size,
  children,
}: {
  size: ContainerProps['size']
  children: ReactNode
}) {
  return (
    <AppShellFooter p="xs">
      <Container size={size} px="md">
        {children}
      </Container>
    </AppShellFooter>
  )
}
