'use client'

import { DIFFICULTY_LABEL_KEY } from '@/components/mantine/DifficultyBadge'
import { payloadSdk } from '@/payload-sdk'
import type { Content, Difficulty } from '@/payload-types'
import { Select, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { PriceInput } from '../PriceInput'
import { SOURCE_LOCALE, useSave } from '../saving'

export const difficultyOptions = (t: (key: string) => string) =>
  (Object.keys(DIFFICULTY_LABEL_KEY) as Difficulty[]).map((value) => ({
    value,
    label: t(DIFFICULTY_LABEL_KEY[value]),
  }))

/**
 * Content metadata, author only (`contents.update`). The body has its own
 * page (`/content/:id/edit`) because it needs the full rich-text editor.
 */
export function ContentMetadataForm({
  content,
}: {
  content: Pick<Content, 'id' | 'title' | 'difficulty' | 'copyright' | 'price'>
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm({
    initialValues: {
      title: content.title,
      difficulty: content.difficulty,
      copyright: content.copyright,
      price: content.price ?? null,
    },
    validate: {
      title: (value) => (value.trim() ? null : t('Required')),
      copyright: (value) => (value.trim() ? null : t('Required')),
    },
  })
  const save = useSave(
    (values: typeof form.values) =>
      payloadSdk.update({
        collection: 'contents',
        id: content.id,
        locale: SOURCE_LOCALE,
        data: { ...values, title: values.title.trim() },
      }),
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('Title')} required {...form.getInputProps('title')} />
        <Select
          label={t('Difficulty')}
          data={difficultyOptions(t)}
          allowDeselect={false}
          {...form.getInputProps('difficulty')}
        />
        <TextInput label={t('Copyright')} required {...form.getInputProps('copyright')} />
        <PriceInput
          cents={form.values.price}
          onChange={(cents) => form.setFieldValue('price', cents)}
        />
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
