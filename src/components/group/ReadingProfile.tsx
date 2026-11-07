'use client'

import { Select } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/** Each device chooses its reader while the family follows the same works. */
export function ReadingProfile({
  ages,
  value,
  onChange,
}: {
  ages: number[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('plan-visit')
  if (!ages.length) return null
  return (
    // Multiline help keeps a readable rhythm and contrast in both themes.
    <div className="text-pretty [&_.mantine-InputWrapper-description]:leading-normal [--mantine-color-dimmed:light-dark(var(--mantine-color-gray-7),var(--mantine-color-gray-5))]">
      <Select
        size="md"
        label={t('Reading for')}
        description={t(
          'Language and detail change only on this device. Everyone follows the same works.',
        )}
        value={value}
        onChange={(next) => onChange(next ?? 'adult')}
        data={[
          { value: 'adult', label: t('Adult') },
          ...[...new Set(ages)]
            .sort((a, b) => a - b)
            .map((age) => ({ value: String(age), label: t('Child aged {{age}}', { age }) })),
        ]}
      />
    </div>
  )
}
