'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Object as MuseumObject } from '@/payload-types'
import { Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'

/**
 * Object name and description, owner only (`objects.update`). Values are the
 * source-locale text; translations refresh lazily after the save.
 */
export function ObjectMetadataForm({
  object,
}: {
  object: Pick<MuseumObject, 'id' | 'name' | 'description'>
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm({
    initialValues: { name: object.name, description: object.description ?? '' },
    validate: { name: (value) => (value.trim() ? null : t('Required')) },
  })
  const save = useSave(
    (values: typeof form.values) =>
      payloadSdk.update({
        collection: 'objects',
        id: object.id,
        locale: SOURCE_LOCALE,
        data: { name: values.name.trim(), description: values.description },
      }),
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('Name')} required {...form.getInputProps('name')} />
        <Textarea
          label={t('Description')}
          autosize
          minRows={3}
          maxLength={500}
          {...form.getInputProps('description')}
        />
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
