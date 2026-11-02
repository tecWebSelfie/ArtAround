'use client'

import { payloadSdk } from '@/payload-sdk'
import { Skeleton, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadContentSource, type ContentSource } from '@/app/[lng]/(frontend)/content/[id]/actions'
import { saveCover, type CoverChange } from '../CoverImageInput'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'
import { ContentFields, contentFieldValidators, type ContentFormValues } from './ContentFields'

/**
 * The content page's editor, author only (`contents.update`): the section's
 * Edit button swaps the title and text for this form, so metadata and the
 * body are edited in one place, where they are read.
 *
 * The page shows the visitor's (possibly translated) text, while the editor
 * works on the source-locale original as HTML. It is fetched only when the
 * form opens (the `loadContentSource` Server Function), so readers and authors
 * who never press Edit pay nothing for it.
 */
export function ContentEditForm({ id }: { id: string }) {
  const { t } = useTranslation('editing')
  const source = useQuery({
    queryKey: ['content-source', id],
    queryFn: () => loadContentSource(id),
    // Always the stored text: another tab or a translation run may have changed it.
    gcTime: 0,
  })

  if (source.isPending) return <Skeleton h={420} radius="sm" />
  if (!source.data) {
    return (
      <Text c="red" size="sm" role="alert">
        {t('Could not load the text')}
      </Text>
    )
  }
  return <LoadedForm id={id} source={source.data} />
}

/** Mounted once the source is in, so `useForm` starts from it. */
function LoadedForm({ id, source }: { id: string; source: ContentSource }) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm<ContentFormValues>({
    initialValues: {
      title: source.title,
      difficulty: source.difficulty,
      copyright: source.copyright,
      price: source.price,
      bodyHTML: source.bodyHTML,
      object: null,
    },
    validate: contentFieldValidators(t),
  })
  const [cover, setCover] = useState<CoverChange>(null)
  const save = useSave(async ({ bodyHTML, object: _object, ...values }: ContentFormValues) => {
    const title = values.title.trim()
    const coverId = cover && (await saveCover(cover, source.cover, 'contentImages', title))
    return payloadSdk.update({
      collection: 'contents',
      id,
      locale: SOURCE_LOCALE,
      data: {
        ...values,
        title,
        // Only a changed body goes back through the HTML → Lexical
        // conversion, so a metadata-only save never rewrites the text.
        ...(bodyHTML !== source.bodyHTML && { bodyHTML }),
        // The cover is the first picture: a new one takes its place, a removed
        // one leaves the others, which are kept as they are.
        ...(cover && {
          images: coverId ? [coverId, ...source.otherImages] : source.otherImages,
        }),
      },
    })
  }, close)

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <ContentFields
          form={form}
          cover={{ current: source.cover, change: cover, onChange: setCover }}
        />
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
