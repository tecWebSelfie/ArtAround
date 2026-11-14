'use client'

import { NavLink, ThemeIcon } from '@mantine/core'
import { ChevronRight, Download } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * One tool of a museum on the "Your museums" page: the tool's icon tinted
 * with the museum's own color, its name, and one line on what it is for.
 * Every tool reads the same way, so the list scans as one set; the trailing
 * icon says where the tap goes (a page, or a file to save).
 *
 * Client-side because a server page can't pass `component={Link}` across the
 * client boundary (same reason as `LinkButton`).
 */
export function MuseumToolLink({
  href,
  label,
  description,
  icon,
  color,
  download = false,
}: {
  href: string
  label: string
  description: string
  icon: ReactNode
  /** The museum's accent (shade 6); the app's primary color without one. */
  color: string | null
  /** A file (the QR labels PDF): a plain download link, not a page. */
  download?: boolean
}) {
  const common = {
    label,
    description,
    leftSection: (
      <ThemeIcon variant="light" color={color ?? undefined} size={40} radius="md">
        {icon}
      </ThemeIcon>
    ),
    rightSection: download ? (
      <Download size={16} aria-hidden className="text-(--mantine-color-dimmed)" />
    ) : (
      <ChevronRight size={16} aria-hidden className="text-(--mantine-color-dimmed)" />
    ),
    py: 'sm',
    className: 'rounded-(--mantine-radius-md)',
    styles: { label: { fontWeight: 600 } },
  } as const
  return download ? (
    <NavLink component="a" href={href} download {...common} />
  ) : (
    <NavLink component={Link} href={href as Route} {...common} />
  )
}
