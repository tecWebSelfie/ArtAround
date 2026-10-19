'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Museum } from '@/payload-types'
import { Group, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { RichTextInput } from '../RichTextInput'
import { SOURCE_LOCALE, useSave } from '../saving'

/**
 * Museum metadata, director only (field access in `Museums.ts`). The
 * description travels as HTML (`descriptionHTML`) and is converted to
 * Lexical on the server; `descriptionHTML` is the stored value rendered by
 * the page with `convertLexicalToHTML`.
 */
export function MuseumMetadataForm({
  museum,
  descriptionHTML,
}: {
  museum: Pick<Museum, 'id' | 'name' | 'shortDescription' | 'email' | 'location'>
  descriptionHTML: string
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm({
    initialValues: {
      name: museum.name,
      shortDescription: museum.shortDescription,
      descriptionHTML,
      email: museum.email ?? '',
      address: museum.location.address,
      city: museum.location.city,
    },
    validate: {
      name: (value) => (value.trim() ? null : t('Required')),
      shortDescription: (value) => (value.trim() ? null : t('Required')),
      address: (value) => (value.trim() ? null : t('Required')),
      city: (value) => (value.trim() ? null : t('Required')),
    },
  })
  const save = useSave(
    ({ address, city, email, ...values }: typeof form.values) =>
      payloadSdk.update({
        collection: 'museums',
        id: museum.id,
        locale: SOURCE_LOCALE,
        data: {
          ...values,
          email: email.trim() || null,
          // Coordinates are kept: only the postal address is edited here.
          location: { ...museum.location, address, city },
        },
      }),
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('Name')} required {...form.getInputProps('name')} />
        <TextInput
          label={t('Short description')}
          required
          maxLength={100}
          {...form.getInputProps('shortDescription')}
        />
        <RichTextInput
          label={t('Description')}
          value={form.values.descriptionHTML}
          onChange={(html) => form.setFieldValue('descriptionHTML', html)}
        />
        <TextInput label={t('Email')} type="email" {...form.getInputProps('email')} />
        <Group grow align="start">
          <TextInput label={t('Address')} required {...form.getInputProps('address')} />
          <TextInput label={t('City')} required {...form.getInputProps('city')} />
        </Group>
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
