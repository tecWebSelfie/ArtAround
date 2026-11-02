'use client'

import { ActionIcon, Paper, SimpleGrid, Text } from '@mantine/core'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Each press walks this many metres. */
export const SIMULATOR_STEP_METRES = 2

/**
 * D-pad for the simulated GPS source: each arrow moves the fake fix two
 * metres north, south, east or west (north is the top of the map).
 */
export function GpsSimulator({ onMove }: { onMove: (east: number, north: number) => void }) {
  const { t } = useTranslation('tour-navigation')
  const step = SIMULATOR_STEP_METRES
  const arrow = (label: string, Icon: typeof ArrowUp, east: number, north: number) => (
    <ActionIcon variant="default" size="lg" aria-label={label} onClick={() => onMove(east, north)}>
      <Icon size={18} />
    </ActionIcon>
  )
  return (
    <Paper
      withBorder
      shadow="sm"
      radius="md"
      p={6}
      role="group"
      aria-label={t('Simulated GPS')}
      style={{ pointerEvents: 'auto' }}
    >
      <Text size="xs" fw={600} ta="center" c="dimmed" mb={4}>
        {t('Simulated GPS · {{metres}} m', { metres: step })}
      </Text>
      <SimpleGrid cols={3} spacing={4} verticalSpacing={4}>
        <span />
        {arrow(t('Walk north'), ArrowUp, 0, step)}
        <span />
        {arrow(t('Walk west'), ArrowLeft, -step, 0)}
        <span />
        {arrow(t('Walk east'), ArrowRight, step, 0)}
        <span />
        {arrow(t('Walk south'), ArrowDown, 0, -step)}
        <span />
      </SimpleGrid>
    </Paper>
  )
}
