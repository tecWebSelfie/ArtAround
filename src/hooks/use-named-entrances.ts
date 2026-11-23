'use client'

import { placedEntrances, type ExitEntranceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** A placed entrance of the museum map, with the name visitors and authors see. */
export type NamedEntrance = { id: string; name: string }

/**
 * Entrances with the names people see: staff's name, else "Entrance"
 * (numbered among the nameless ones when there are several). One rule for
 * navigation's "Where are you?" and progress bar and for the tour editor's
 * start entrance, so all three call an entrance the same.
 */
export function useEntranceNames(entrances: readonly { id: string; name?: string | null }[]) {
  const { t } = useTranslation('tour-navigation')
  return useMemo<NamedEntrance[]>(() => {
    const nameless = entrances.filter((entrance) => !entrance.name).length
    let number = 0
    return entrances.map((entrance) => ({
      id: entrance.id,
      name:
        entrance.name ||
        (nameless > 1 ? t('Entrance {{number}}', { number: ++number }) : t('Entrance')),
    }))
  }, [entrances, t])
}

/** The map's placed entrances among its entrance/exit markers, named (`useEntranceNames`). */
export function useNamedEntrances(exitEntrances: readonly ExitEntranceMarker[]) {
  const placed = useMemo(() => placedEntrances(exitEntrances), [exitEntrances])
  return useEntranceNames(placed)
}
