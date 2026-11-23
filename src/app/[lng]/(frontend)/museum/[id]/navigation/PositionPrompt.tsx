'use client'

import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core'
import { ChevronDown, DoorOpen, MapPinOff, ScanQrCode, Search } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { NamedEntrance } from '@/hooks/use-named-entrances'
import { NAVIGATION_COMPACT_ACTION_CLASS } from './navigation-touch'

/** An entrance the visitor can say they stand at (an entrance marker of the map). */
export type PromptEntrance = NamedEntrance

/**
 * "Where are you?", opened: the directions strip's `no-position` state when
 * the visitor has not said where they are (DESIGN.md, The One Strip Rule: a
 * route state is a state of the strip, never another banner).
 *
 * The map cannot know where a visitor stands indoors, and the product only
 * moves the position on an explicit confirmation, so instead of a modal (the
 * map stays usable meanwhile) the strip spells out the ways to say it, most
 * likely first:
 * - an entrance, where every visit starts: one button per entrance of the
 *   museum, named as staff named them, so a museum with several entrances
 *   lets the visitor say which one;
 * - the QR code beside a work;
 * - the work in front of them, found by search.
 *
 * "Hide" folds it back into the one-line strip, whose tap opens it again.
 */
export function PositionPrompt({
  entrances,
  onEntrance,
  onScan,
  onSearch,
  onHide,
}: {
  entrances: PromptEntrance[]
  onEntrance: (id: string) => void
  onScan: () => void
  onSearch?: () => void
  onHide: () => void
}) {
  const { t } = useTranslation('tour-navigation')
  const titleId = useId()
  const action = NAVIGATION_COMPACT_ACTION_CLASS
  // Answers fill the strip in as many equal columns as fit (two on a phone
  // beside the assistant, more on a wide strip), so short and long labels
  // line up instead of leaving a ragged row; labels wrap, targets stay 44px.
  const answers =
    'grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-(--mantine-spacing-xs)'
  return (
    <Stack component="section" aria-labelledby={titleId} gap="xs" className="py-1">
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Group gap="xs" wrap="nowrap" className="min-w-0">
          <MapPinOff
            size={20}
            aria-hidden
            className="shrink-0 text-(--mantine-color-museum-light-color)"
          />
          <Text id={titleId} fw={700} size="sm">
            {t('Where are you?')}
          </Text>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onHide}
          aria-label={t('Hide')}
          className={action}
        >
          <ChevronDown size={18} aria-hidden />
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed">
        {t('Tell the map where you are and it shows you the way.')}
      </Text>
      {entrances.length > 0 && (
        <div role="group" aria-label={t('Entrances')} className={answers}>
          {entrances.map((entrance) => (
            <Button
              key={entrance.id}
              size="sm"
              radius="xl"
              fullWidth
              color="museum.8"
              autoContrast
              leftSection={<DoorOpen size={16} aria-hidden />}
              onClick={() => onEntrance(entrance.id)}
              className={action}
            >
              {entrances.length === 1
                ? t("I'm at {{entrance}}", { entrance: entrance.name })
                : entrance.name}
            </Button>
          ))}
        </div>
      )}
      <div className={answers}>
        <Button
          size="sm"
          radius="xl"
          fullWidth
          variant="default"
          leftSection={<ScanQrCode size={16} aria-hidden />}
          onClick={onScan}
          className={action}
        >
          {t("Scan a work's QR code")}
        </Button>
        <Button
          size="sm"
          radius="xl"
          fullWidth
          variant="default"
          leftSection={<Search size={16} aria-hidden />}
          onClick={onSearch}
          className={action}
        >
          {t('Find the work in front of you')}
        </Button>
      </div>
    </Stack>
  )
}
