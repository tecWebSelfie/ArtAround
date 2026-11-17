'use client'

import { Button, type ButtonProps } from '@mantine/core'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { NAVIGATION_HIT_AREA } from './navigation-touch'

/**
 * A quiet tool in the map's dock capsules (`NavigationControls`), adapted to
 * the form factor rather than scaled:
 *
 * - below `md` (phones, tablets in portrait: touch, little width) it is a
 *   36px round icon, a 44px target through `NAVIGATION_HIT_AREA`, named by
 *   `aria-label`;
 * - from `md` (desktop: room to spare, a pointer that can't guess) the label
 *   shows beside the icon, so every tool says what it does without hovering.
 *
 * The visible label and the accessible name are the same words. It forwards
 * its ref and props, so it can be a `Popover.Target` (Services, Settings).
 */
export function DockButton({
  icon,
  label,
  className = '',
  ...props
}: Omit<ButtonProps, 'children' | 'leftSection'> &
  Omit<ComponentPropsWithRef<'button'>, 'children' | 'color' | 'style'> & {
    icon: ReactNode
    label: string
  }) {
  return (
    <Button
      variant="subtle"
      color="gray"
      radius="xl"
      size="sm"
      aria-label={label}
      className={`${NAVIGATION_HIT_AREA} below-md:w-9 below-md:px-0 [&_.mantine-Button-label]:gap-1.5 ${className}`}
      {...props}
    >
      {icon}
      <span className="below-md:hidden">{label}</span>
    </Button>
  )
}
