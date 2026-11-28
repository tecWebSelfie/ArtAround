'use client'

import { Anchor, Badge, type AnchorProps, type BadgeProps } from '@mantine/core'
import type { Route } from 'next'
import { ProgressLink } from '@/components/navigation/ProgressLink'
import type { ReactNode } from 'react'

/**
 * Mantine Anchor and Badge rendered as Next Links, for server components.
 * A server component can't pass `component={ProgressLink}` (a function) across the
 * client boundary: the page fails to render. Same idea as `LinkButton`.
 */
export function LinkAnchor({
  href,
  children,
  ...props
}: Omit<AnchorProps, 'component'> & { href: Route; children: ReactNode }) {
  return (
    <Anchor component={ProgressLink} href={href} {...props}>
      {children}
    </Anchor>
  )
}

export function LinkBadge({
  href,
  children,
  ...props
}: Omit<BadgeProps, 'component'> & { href: Route; children: ReactNode }) {
  return (
    <Badge component={ProgressLink} href={href} {...props}>
      {children}
    </Badge>
  )
}
