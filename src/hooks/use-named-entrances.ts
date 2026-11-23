'use client'

import { placedEntrances, type ExitEntranceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** A placed entrance of the museum map, with the name visitors and authors see. */
export type NamedEntrance = { id: string; name: string }

/**
 * The museum's placed entrances with the names people see: staff's name, else
 * "Entrance" (numbered among the nameless ones when there are several). One
 * list for navigation's "Where are you?" and progress bar and for the tour
 * editor's start entrance, so all three call an entrance the same.
 */
export function useNamedEntrances(exitEntrances: readonly ExitEntranceMarker[]) {
  const { t } = useTranslation('tour-navigation')
  return useMemo<NamedEntrance[]>(() => {
    const placed = placedEntrances(exitEntrances)
    const nameless = placed.filter((node) => !node.name).length
    let number = 0
    return placed.map((node) => ({
      id: node.id,
      name:
        node.name ||
        (nameless > 1 ? t('Entrance {{number}}', { number: ++number }) : t('Entrance')),
    }))
  }, [exitEntrances, t])
}
