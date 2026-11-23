'use client'

import { Select } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useEntranceNames } from '@/hooks/use-named-entrances'

/**
 * Where the tour starts: one of the museum's placed entrances, or
 * automatically the one nearest the first stop (the empty value, the
 * default), which follows the stops if the author reorders them. Shown only
 * when the map has entrances; with a single one there is nothing to choose
 * beyond the automatic pick, so it is not shown either. A saved entrance the
 * staff later removed reads as automatic: navigation already falls back so.
 */
export function StartEntranceInput({
  entrances,
  value,
  onChange,
}: {
  /** The museum's placed entrances (empty unless there are two or more). */
  entrances: { id: string; name: string | null }[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('editing')
  const named = useEntranceNames(entrances)
  if (named.length < 2) return null
  const automatic = 'automatic'
  const known = named.some((entrance) => entrance.id === value)
  return (
    <Select
      label={t('Start entrance')}
      description={t('Where the tour begins: its first stop is reached from here.')}
      data={[
        { value: automatic, label: t('Nearest to the first stop') },
        ...named.map((entrance) => ({ value: entrance.id, label: entrance.name })),
      ]}
      value={known ? value : automatic}
      allowDeselect={false}
      onChange={(next) => onChange(!next || next === automatic ? '' : next)}
    />
  )
}
