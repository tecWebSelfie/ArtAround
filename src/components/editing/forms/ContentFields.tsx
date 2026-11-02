'use client'

import { DIFFICULTY_LABEL_KEY } from '@/components/mantine/DifficultyBadge'
import type { Difficulty } from '@/payload-types'
import { Group, Select, Skeleton, TextInput } from '@mantine/core'
import type { UseFormReturnType } from '@mantine/form'
import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { CoverImageInput } from '../CoverImageInput'
import { PriceInput } from '../PriceInput'

/**
 * The fields of a content, shared by the two forms that write one:
 * `ContentForm` (`/content/new`) and `ContentEditForm` (inline on the content
 * page). Values, validation and markup live here once, so a new content field
 * is added in one place.
 */

/** `object` is only used when creating (the object the text is about). */
export type ContentFormValues = {
  title: string
  difficulty: Difficulty
  copyright: string
  price: number | null
  bodyHTML: string
  object: string | null
}

export const difficultyOptions = (t: (key: string) => string) =>
  (Object.keys(DIFFICULTY_LABEL_KEY) as Difficulty[]).map((value) => ({
    value,
    label: t(DIFFICULTY_LABEL_KEY[value]),
  }))

/** Validators of the shared fields; each form adds its own (e.g. `object`). */
export const contentFieldValidators = (t: (key: string) => string) => ({
  title: (value: string) => (value.trim() ? null : t('Required')),
  copyright: (value: string) => (value.trim() ? null : t('Required')),
  bodyHTML: (value: string) => (value.trim() ? null : t('Required')),
})

// TipTap is heavy: load the editor with the form (an author opening it), not
// with the pages that merely link to it.
const RichTextInput = dynamic(() => import('../RichTextInput').then((m) => m.RichTextInput), {
  ssr: false,
  loading: () => <Skeleton h={240} radius="sm" />,
})

/**
 * The cover picture (the content's first image) is not a form value: it is a
 * file until saved, so each form keeps it in its own state and passes it here.
 */
export type ContentCover = ComponentProps<typeof CoverImageInput>

export function ContentFields({
  form,
  cover,
}: {
  form: UseFormReturnType<ContentFormValues>
  cover: ContentCover
}) {
  const { t } = useTranslation('editing')
  return (
    <>
      <TextInput label={t('Title')} required {...form.getInputProps('title')} />
      <CoverImageInput {...cover} />
      <Group grow align="start">
        <Select
          label={t('Difficulty')}
          data={difficultyOptions(t)}
          allowDeselect={false}
          {...form.getInputProps('difficulty')}
        />
        <TextInput label={t('Copyright')} required {...form.getInputProps('copyright')} />
      </Group>
      <PriceInput
        cents={form.values.price}
        onChange={(cents) => form.setFieldValue('price', cents)}
      />
      <RichTextInput
        label={t('Text')}
        required
        value={form.values.bodyHTML}
        onChange={(html) => form.setFieldValue('bodyHTML', html)}
        error={form.errors.bodyHTML}
      />
    </>
  )
}
