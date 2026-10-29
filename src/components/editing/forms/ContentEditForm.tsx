'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Content } from '@/payload-types'
import { Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'
import { ContentFields, contentFieldValidators, type ContentFormValues } from './ContentFields'

/**
 * The content page's editor, author only (`contents.update`): the section's
 * Edit button swaps the title and text for this form, so metadata and the
 * body are edited in one place, where they are read.
 */
export function ContentEditForm({
  content,
  bodyHTML,
}: {
  content: Pick<Content, 'id' | 'title' | 'difficulty' | 'copyright' | 'price'>
  /** The stored body (source locale) converted to HTML for the editor. */
  bodyHTML: string
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm<ContentFormValues>({
    initialValues: {
      title: content.title,
      difficulty: content.difficulty,
      copyright: content.copyright,
      price: content.price ?? null,
      bodyHTML,
      object: null,
    },
    validate: contentFieldValidators(t),
  })
  const save = useSave(
    ({ bodyHTML: html, object: _object, ...values }: ContentFormValues) =>
      payloadSdk.update({
        collection: 'contents',
        id: content.id,
        locale: SOURCE_LOCALE,
        data: {
          ...values,
          title: values.title.trim(),
          // Only a changed body goes back through the HTML → Lexical
          // conversion, so a metadata-only save never rewrites the text.
          ...(html !== bodyHTML && { bodyHTML: html }),
        },
      }),
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <ContentFields form={form} />
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
