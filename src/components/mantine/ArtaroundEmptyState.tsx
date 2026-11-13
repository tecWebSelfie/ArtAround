import { TOUR_GRADIENT } from '@/theme'
import { Button, EmptyState, EmptyStateActions, Stack, ThemeIcon, Title } from '@mantine/core'
import { Amphora, Plus, Route as RouteIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

/**
 * An empty tours or contents section (a profile with nothing authored yet).
 *
 * It keeps the section's place and identity instead of a lone dimmed line:
 * the same h2 the filled carousel shows, then a slot the size of a card on
 * the page's own neutral surface (dashed default border, a faint wash of the
 * kind color at its top), whose icon carries the kind's identity: the tour
 * gradient, the content teal (DESIGN.md → Colors).
 * So an empty profile reads as the same page with room still to fill, not a
 * different, colder one.
 *
 * `action` is for the people who can fill it: pass it only to them (the
 * profile's owner, not its visitors), who then get the way to make the
 * first one; it wears the kind's color too (the tour gradient, as on the
 * other tour actions; teal for a content).
 *
 * Server-safe: the parts are Mantine's named exports, since
 * `EmptyState.Actions` (a static member) isn't reachable from a server
 * component.
 */
const KIND = {
  tour: {
    icon: RouteIcon,
    themeIcon: { variant: 'gradient', gradient: TOUR_GRADIENT },
    button: { variant: 'gradient', gradient: TOUR_GRADIENT },
    wash: 'var(--mantine-color-grape-light)',
  },
  content: {
    icon: Amphora,
    themeIcon: { variant: 'filled', color: 'teal' },
    button: { variant: 'filled', color: 'teal' },
    wash: 'var(--mantine-color-teal-light)',
  },
} as const

export function ArtaroundEmptyState({
  kind,
  heading,
  title,
  description,
  action,
}: {
  kind: keyof typeof KIND
  /** The section's h2, as the filled carousel titles it ("Tours", "Contents"). */
  heading?: string
  title: string
  description?: string
  action?: { label: string; href: Route }
}) {
  const { icon: Icon, themeIcon, button, wash } = KIND[kind]
  return (
    <Stack component="section" gap="md">
      {heading && (
        <Title order={2} size="h5">
          {heading}
        </Title>
      )}
      {/* The card-sized slot: dashed in the default border, so it reads as a
          place waiting for something rather than a finished card. The kind
          color stays on the icon and the action. */}
      <EmptyState
        size="sm"
        icon={
          <ThemeIcon size={56} radius="xl" {...themeIcon}>
            <Icon size={28} aria-hidden />
          </ThemeIcon>
        }
        title={title}
        description={description}
        className="rounded-(--mantine-radius-lg) border-2 border-dashed border-(--mantine-color-default-border) px-(--mantine-spacing-md) py-(--mantine-spacing-xl)"
        // A faint wash of the kind color fading into the page, under the icon:
        // a hint of the kind, not a colored block (full tints read as alerts).
        style={{ backgroundImage: `radial-gradient(ellipse at 50% 0%, ${wash}, transparent 70%)` }}
      >
        {action && (
          <EmptyStateActions>
            <Button
              component={Link}
              href={action.href}
              radius="xl"
              leftSection={<Plus size={16} aria-hidden />}
              {...button}
            >
              {action.label}
            </Button>
          </EmptyStateActions>
        )}
      </EmptyState>
    </Stack>
  )
}
