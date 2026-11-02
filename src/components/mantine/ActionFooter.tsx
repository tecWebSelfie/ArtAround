import {
  AppShellFooter,
  Box,
  type BoxProps,
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
 * `inlineFrom`: detail and outcome pages pass `md`. On desktop the visitor
 * browses rather than walks, so from that breakpoint the footer steps aside
 * and the same action renders inline, where this component is placed (right
 * under what it acts on; `inlineProps` sizes and spaces it). The footer is
 * fixed, so its place in the tree doesn't move it on phones. Step flows
 * (quiz) leave it unset and keep the footer at every width.
 */
export function ActionFooter({
  size,
  inlineFrom,
  inlineProps,
  children,
}: {
  size: ContainerProps['size']
  inlineFrom?: MantineBreakpoint
  inlineProps?: BoxProps
  children: ReactNode
}) {
  return (
    <>
      {inlineFrom && (
        <Box visibleFrom={inlineFrom} {...inlineProps}>
          {children}
        </Box>
      )}
      <AppShellFooter p="xs" hiddenFrom={inlineFrom}>
        <Container size={size} px="md">
          {children}
        </Container>
      </AppShellFooter>
    </>
  )
}
