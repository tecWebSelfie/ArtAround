'use client'

import { Button, Group } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from './EditableSection'

/** Save / Cancel row shared by inline forms (Cancel leaves the editable section). */
export function FormActions({ saving, submitLabel }: { saving: boolean; submitLabel?: string }) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  return (
    <Group justify="end" gap="xs">
      <Button variant="default" onClick={close} disabled={saving}>
        {t('Cancel')}
      </Button>
      <Button type="submit" loading={saving}>
        {submitLabel ?? t('Save')}
      </Button>
    </Group>
  )
}
