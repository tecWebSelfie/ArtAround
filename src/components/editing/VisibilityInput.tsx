'use client'

import { Input, SegmentedControl } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/**
 * Public or private, for contents and tours (`src/lib/visibility.ts`). A
 * private one is read only by its author and by the guests of a group visit
 * of a tour that includes it: a teacher's class visit. The server enforces
 * the rules (no private sales, no private contents in a public tour); this
 * only says what each choice means.
 */
type Visibility = 'public' | 'private'

export function VisibilityInput({
  value,
  onChange,
  kind,
}: {
  value: Visibility
  onChange: (value: Visibility) => void
  kind: 'content' | 'tour'
}) {
  const { t } = useTranslation('editing')
  return (
    <Input.Wrapper
      label={t('Visibility')}
      description={
        value === 'private'
          ? kind === 'tour'
            ? t('Only you and the guests of your group visits can see this tour')
            : t('Only you and the guests of your group visits can read this content')
          : t('Everyone can find it in the marketplace and in search')
      }
    >
      <SegmentedControl
        mt={4}
        value={value}
        onChange={(next) => onChange(next as Visibility)}
        data={[
          { value: 'public', label: t('Public') },
          { value: 'private', label: t('Private') },
        ]}
      />
    </Input.Wrapper>
  )
}
