'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Content, Difficulty } from '@/payload-types'
import { Button, Group, Select, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { useTranslation } from 'react-i18next'
import { backToTourHref } from '@/lib/tour-picker'
import { ObjectPicker } from '../ObjectPicker'
import { PriceInput } from '../PriceInput'
import { RichTextInput } from '../RichTextInput'
import { SOURCE_LOCALE, useSave } from '../saving'
import { difficultyOptions } from './ContentMetadataForm'

type ContentValues = {
  title: string
  difficulty: Difficulty
  copyright: string
  price: number | null
  bodyHTML: string
  object: string | null
}

/**
 * Full content editor for `/content/new` and `/content/:id/edit`.
 *
 * New contents are written about an object: the create call passes
 * `attachToObject`, and the server links the content in `objects.contents`
 * without the author needing rights on the object. The body is sent as HTML
 * (`bodyHTML`) and converted to Lexical server-side.
 */
export function ContentForm({
  content,
  bodyHTML = '',
  initialObject,
  museum,
  returnTo,
}: {
  /** Existing content (source-locale values) when editing; absent to create. */
  content?: Pick<Content, 'id' | 'title' | 'difficulty' | 'copyright' | 'price'>
  bodyHTML?: string
  initialObject?: { id: string; name: string } | null
  /** Writing a tour stop: only this museum's objects can be chosen. */
  museum?: { name: string; objectIds: string[] } | null
  /** Writing a tour stop: the tour editor to return to (`backToTourHref`). */
  returnTo?: string | null
}) {
  const { t } = useTranslation('editing')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const form = useForm<ContentValues>({
    initialValues: {
      title: content?.title ?? '',
      difficulty: content?.difficulty ?? 'easy',
      copyright: content?.copyright ?? '',
      price: content?.price ?? null,
      bodyHTML,
      object: initialObject?.id ?? null,
    },
    validate: {
      title: (value) => (value.trim() ? null : t('Required')),
      copyright: (value) => (value.trim() ? null : t('Required')),
      bodyHTML: (value) => (value.trim() ? null : t('Required')),
      object: (value) => (content || value ? null : t('Choose the object')),
    },
  })

  const save = useSave(
    async ({ object, ...values }: ContentValues) => {
      const data = { ...values, title: values.title.trim() }
      if (content) {
        return payloadSdk.update({
          collection: 'contents',
          id: content.id,
          locale: SOURCE_LOCALE,
          data,
        })
      }
      return payloadSdk.create({
        collection: 'contents',
        locale: SOURCE_LOCALE,
        // `body` is required by the generated type but is produced on the
        // server from `bodyHTML` (see src/fields/richTextHtml.ts).
        data: { ...data, attachToObject: object } as RequiredDataFromCollectionSlug<'contents'>,
      })
    },
    // A new tour stop goes straight back into the tour being edited.
    (saved) =>
      router.push(
        (returnTo && !content
          ? backToTourHref(returnTo, saved.id)
          : `/${lng}/content/${saved.id}`) as Route,
      ),
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <Title order={2}>{content ? t('Edit content') : t('New content')}</Title>
        {!content && (
          <ObjectPicker
            value={form.values.object}
            initial={initialObject}
            museum={museum}
            onChange={(id) => form.setFieldValue('object', id)}
            error={form.errors.object as string | undefined}
          />
        )}
        <TextInput label={t('Title')} required {...form.getInputProps('title')} />
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
        <Group justify="end">
          <Button variant="default" onClick={() => router.back()} disabled={save.isPending}>
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {content ? t('Save') : t('Publish')}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
