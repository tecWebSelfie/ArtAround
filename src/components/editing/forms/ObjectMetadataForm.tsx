'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Object as MuseumObject } from '@/payload-types'
import { Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoverImageInput, saveCover, type CoverChange, type CurrentImage } from '../CoverImageInput'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'

/**
 * Object name, photo and description, owner only (`objects.update`). Values
 * are the source-locale text; translations refresh lazily after the save. A
 * new photo is uploaded on save (`saveCover`), named after the object.
 */
export function ObjectMetadataForm({
  object,
  thumbnail,
}: {
  object: Pick<MuseumObject, 'id' | 'name' | 'description'>
  /** The stored photo, for the preview and to keep it when unchanged. */
  thumbnail: CurrentImage | null
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm({
    initialValues: { name: object.name, description: object.description ?? '' },
    validate: { name: (value) => (value.trim() ? null : t('Required')) },
  })
  const [cover, setCover] = useState<CoverChange>(null)
  const save = useSave(async (values: typeof form.values) => {
    const name = values.name.trim()
    return payloadSdk.update({
      collection: 'objects',
      id: object.id,
      locale: SOURCE_LOCALE,
      data: {
        name,
        description: values.description,
        thumbnail: await saveCover(cover, thumbnail, 'objectsThumbnails', name),
      },
    })
  }, close)

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('Name')} required {...form.getInputProps('name')} />
        <CoverImageInput current={thumbnail} change={cover} onChange={setCover} />
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
