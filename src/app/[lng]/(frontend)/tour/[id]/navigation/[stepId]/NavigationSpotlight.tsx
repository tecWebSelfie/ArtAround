'use client'

import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { Button, Group, Stack, Text } from '@mantine/core'
import { Spotlight, spotlight } from '@mantine/spotlight'
import { Route as RouteIcon, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NavigationCommand } from './navigation-commands'

/**
 * Keyboard shortcuts that open the search: Mantine's default mod+K plus "/",
 * the usual map/search key on desktop (both ignored while typing in a field).
 * The search control's tooltip shows "/".
 */
const NAVIGATION_SEARCH_SHORTCUTS = ['mod + K', '/']

/** Results shown at once; the list stays scannable on a phone. */
const RESULT_LIMIT = 8

/**
 * Navigation search over the shared command list. With an empty query it shows
 * actionable pills instead of a long list: quick commands (nearest services,
 * exit, wheelchair route, resume tour) and the latest nearby suggestions, so a
 * suggestion missed in its notification can always be found again here.
 *
 * In free navigation the museum's tours lead the empty Spotlight as gradient
 * pills (the tour identity, DESIGN.md → Colors): starting a tour is the main
 * way to use the app, so it is offered before anything else.
 */
export function NavigationSpotlight({
  commands,
  nearby,
  onRun,
}: {
  commands: NavigationCommand[]
  /** Commands for contents suggested nearby (newest first). */
  nearby: NavigationCommand[]
  onRun: (command: NavigationCommand) => void
}) {
  const { t } = useTranslation('tour-navigation')
  const [query, setQuery] = useState('')
  const text = query.trim().toLowerCase()
  const results = commands
    .filter(
      (command) =>
        command.group !== 'quick' &&
        `${command.label} ${command.description}`.toLowerCase().includes(text),
    )
    .slice(0, RESULT_LIMIT)
  const run = (command: NavigationCommand) => {
    spotlight.close()
    onRun(command)
  }
  const tours = commands.filter((command) => command.group === 'tour')
  const pills = (title: string, list: NavigationCommand[], accent = false) =>
    list.length > 0 && (
      <Stack gap={6}>
        <Text size="xs" c="dimmed" fw={600}>
          {title}
        </Text>
        <Group gap={6}>
          {list.map((command) => (
            <Button
              key={command.id}
              size="compact-sm"
              radius="xl"
              {...(accent
                ? {
                    variant: 'gradient',
                    gradient: { from: 'grape', to: 'orange' },
                    leftSection: <RouteIcon size={14} aria-hidden />,
                  }
                : { variant: 'light' })}
              rightSection={
                command.lockedPrice ? (
                  <LockedPriceBadge price={command.lockedPrice} size="xs" />
                ) : null
              }
              onClick={() => run(command)}
            >
              {command.label}
            </Button>
          ))}
        </Group>
      </Stack>
    )

  return (
    <Spotlight.Root
      shortcut={NAVIGATION_SEARCH_SHORTCUTS}
      query={query}
      onQueryChange={setQuery}
    >
      <Spotlight.Search
        placeholder={
          tours.length > 0
            ? t('Search tours, objects, contents, and services')
            : t('Search objects, contents, and services')
        }
        aria-label={t('Search')}
        leftSection={<Search size={18} />}
        // On desktop the search can open over a docked content panel, and every
        // Mantine modal closes on a window-level Escape. Mantine's opt-out
        // attribute keeps this key press from closing the panel too; the
        // search closes itself here instead.
        data-mantine-stop-propagation
        onKeyDown={(event) => {
          if (event.key === 'Escape') spotlight.close()
        }}
      />
      <Spotlight.ActionsList>
        {text ? (
          results.length > 0 ? (
            results.map((command) => (
              <Spotlight.Action
                key={command.id}
                label={command.label}
                description={command.description}
                leftSection={
                  command.group === 'tour' ? (
                    <RouteIcon size={18} color="var(--mantine-color-grape-6)" aria-hidden />
                  ) : null
                }
                rightSection={
                  command.lockedPrice ? <LockedPriceBadge price={command.lockedPrice} /> : null
                }
                onClick={() => onRun(command)}
              />
            ))
          ) : (
            <Spotlight.Empty>{t('No results found')}</Spotlight.Empty>
          )
        ) : (
          <Stack gap="md" p="sm">
            {pills(t('Tours in this museum'), tours, true)}
            {pills(t('Nearby'), nearby)}
            {pills(
              t('Quick actions'),
              commands.filter((command) => command.group === 'quick'),
            )}
          </Stack>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  )
}
