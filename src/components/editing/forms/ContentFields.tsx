'use client'

import { DIFFICULTY_LABEL_KEY } from '@/components/mantine/DifficultyBadge'
import {
  DEFAULT_LICENSE,
  effectiveLicense,
  LICENSE_NAME,
  LICENSES,
  type License,
} from '@/lib/content-rights'
import type { Difficulty } from '@/payload-types'
import { Checkbox, Group, Select, Skeleton, TextInput } from '@mantine/core'
import type { UseFormReturnType } from '@mantine/form'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { CoverImageInput } from '../CoverImageInput'
import { VisibilityInput } from '../VisibilityInput'
import { PriceInput } from '../PriceInput'
import { loadRightsMuseums } from './rights-actions'

/**
 * The fields of a content, shared by the two forms that write one:
 * `ContentForm` (`/content/new`) and `ContentEditForm` (inline on the content
 * page). Values, validation and markup live here once, so a new content field
 * is added in one place.
 */

/**
 * `object` and `rightsDeclared` are only used when creating: the object the
 * text is about, and the author's declaration that the text is theirs.
 * `rightsMuseum` is the rights holder when it isn't the author (a museum id).
 */
export type ContentFormValues = {
  title: string
  difficulty: Difficulty
  license: License
  rightsMuseum: string | null
  /** Private: only the author and group-visit guests (src/lib/visibility.ts). */
  visibility: 'public' | 'private'
  price: number | null
  bodyHTML: string
  object: string | null
  rightsDeclared: boolean
}

/** Starting values of the rights fields for a new content. */
export const NEW_CONTENT_RIGHTS = {
  visibility: 'public',
  license: DEFAULT_LICENSE,
  rightsMuseum: null,
  rightsDeclared: false,
} satisfies Partial<ContentFormValues>

/** Select value standing for "the author holds the rights" (no museum). */
const AUTHOR_HOLDER = 'author'

export const difficultyOptions = (t: (key: string) => string) =>
  (Object.keys(DIFFICULTY_LABEL_KEY) as Difficulty[]).map((value) => ({
    value,
    label: t(DIFFICULTY_LABEL_KEY[value]),
  }))

/** Validators of the shared fields; each form adds its own (e.g. `object`). */
export const contentFieldValidators = (t: (key: string) => string) => ({
  title: (value: string) => (value.trim() ? null : t('Required')),
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
  isNew = false,
}: {
  form: UseFormReturnType<ContentFormValues>
  cover: ContentCover
  /** Creating: asks for the rights declaration (`rightsDeclaredAt`). */
  isNew?: boolean
}) {
  const { t } = useTranslation('editing')
  // Museums the author may name as rights holder (curator or director there).
  const rightsMuseums = useQuery({
    queryKey: ['rights-museums'],
    queryFn: () => loadRightsMuseums(),
    staleTime: 5 * 60_000,
  })
  // A paid content is always "all rights reserved" (the server enforces it too).
  const paid = (form.values.price ?? 0) > 0
  const license = effectiveLicense(form.values.price, form.values.license)
  return (
    <>
      <TextInput label={t('Title')} required {...form.getInputProps('title')} />
      <CoverImageInput {...cover} />
      <Select
        label={t('Difficulty')}
        data={difficultyOptions(t)}
        allowDeselect={false}
        {...form.getInputProps('difficulty')}
      />
      <PriceInput
        cents={form.values.price}
        onChange={(cents) => form.setFieldValue('price', cents)}
      />
      <VisibilityInput
        kind="content"
        value={form.values.visibility}
        onChange={(value) => form.setFieldValue('visibility', value)}
      />
      <Group grow align="start">
        <Select
          label={t('Rights holder')}
          data={[
            { value: AUTHOR_HOLDER, label: t('You, the author') },
            ...(rightsMuseums.data ?? []).map(({ id, name }) => ({ value: id, label: name })),
          ]}
          value={form.values.rightsMuseum ?? AUTHOR_HOLDER}
          onChange={(value) =>
            form.setFieldValue('rightsMuseum', value && value !== AUTHOR_HOLDER ? value : null)
          }
          allowDeselect={false}
        />
        <Select
          label={t('License')}
          description={paid ? t('Paid contents are always all rights reserved') : undefined}
          data={LICENSES.map((value) => ({
            value,
            label: value === 'all-rights-reserved' ? t('All rights reserved') : LICENSE_NAME[value],
          }))}
          value={license}
          onChange={(value) => value && form.setFieldValue('license', value as License)}
          disabled={paid}
          allowDeselect={false}
        />
      </Group>
      <RichTextInput
        label={t('Text')}
        required
        value={form.values.bodyHTML}
        onChange={(html) => form.setFieldValue('bodyHTML', html)}
        error={form.errors.bodyHTML}
      />
      {isNew && (
        <Checkbox
          label={t('I am the author of this text, or I hold its rights')}
          {...form.getInputProps('rightsDeclared', { type: 'checkbox' })}
        />
      )}
    </>
  )
}
