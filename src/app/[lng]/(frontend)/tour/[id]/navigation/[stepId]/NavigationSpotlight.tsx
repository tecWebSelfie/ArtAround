'use client'

import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import { Button, Group, Stack, Text } from '@mantine/core'
import { Spotlight, spotlight } from '@mantine/spotlight'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NavigationCommand } from './navigation-commands'

/** Results shown at once; the list stays scannable on a phone. */
const RESULT_LIMIT = 8

/**
 * Navigation search over the shared command list. With an empty query it shows
 * actionable pills instead of a long list: quick commands (nearest services,
 * exit, wheelchair route, resume tour) and the latest nearby suggestions, so a
 * suggestion missed in its notification can always be found again here.
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
  const pills = (title: string, list: NavigationCommand[]) =>
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
              variant="light"
              rightSection={
                command.lockedPrice ? <LockedPriceBadge price={command.lockedPrice} size="xs" /> : null
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
    <Spotlight.Root query={query} onQueryChange={setQuery}>
      <Spotlight.Search
        placeholder={t('Search objects, contents, and services')}
        aria-label={t('Search')}
        leftSection={<Search size={18} />}
      />
      <Spotlight.ActionsList>
        {text ? (
          results.length > 0 ? (
            results.map((command) => (
              <Spotlight.Action
                key={command.id}
                label={command.label}
                description={command.description}
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
