'use client'

import { Button, type ButtonProps } from '@mantine/core'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Mantine Button rendered as a Next Link. Server components can't pass
 * `component={Link}` (a function) across the client boundary, so detail
 * pages use this for their "Add …" / "Edit …" actions.
 */
export function LinkButton({
  href,
  children,
  ...props
}: Omit<ButtonProps, 'component'> & { href: Route; children: ReactNode }) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  )
}
