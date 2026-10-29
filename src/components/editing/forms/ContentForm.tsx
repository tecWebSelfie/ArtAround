'use client'

import { payloadSdk } from '@/payload-sdk'
import { Button, Group, Stack, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { useTranslation } from 'react-i18next'
import { backToTourHref } from '@/lib/tour-picker'
import { ObjectPicker } from '../ObjectPicker'
import { SOURCE_LOCALE, useSave } from '../saving'
import { ContentFields, contentFieldValidators, type ContentFormValues } from './ContentFields'

/**
 * New content editor (`/content/new`). Existing contents are edited inline on
 * their page (`ContentEditForm`), with the same fields (`ContentFields`).
 *
 * New contents are written about an object: the create call passes
 * `attachToObject`, and the server links the content in `objects.contents`
 * without the author needing rights on the object. The body is sent as HTML
 * (`bodyHTML`) and converted to Lexical server-side.
 */
export function ContentForm({
  initialObject,
  museum,
  returnTo,
}: {
  initialObject?: { id: string; name: string } | null
  /** Writing a tour stop: only this museum's objects can be chosen. */
  museum?: { name: string; objectIds: string[] } | null
  /** Writing a tour stop: the tour editor to return to (`backToTourHref`). */
  returnTo?: string | null
}) {
  const { t } = useTranslation('editing')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const form = useForm<ContentFormValues>({
    initialValues: {
      title: '',
      difficulty: 'easy',
      copyright: '',
      price: null,
      bodyHTML: '',
      object: initialObject?.id ?? null,
    },
    validate: {
      ...contentFieldValidators(t),
      object: (value) => (value ? null : t('Choose the object')),
    },
  })

  const save = useSave(
    ({ object, ...values }: ContentFormValues) =>
      payloadSdk.create({
        collection: 'contents',
        locale: SOURCE_LOCALE,
        // `body` is required by the generated type but is produced on the
        // server from `bodyHTML` (see src/fields/richTextHtml.ts).
        data: {
          ...values,
          title: values.title.trim(),
          attachToObject: object,
        } as RequiredDataFromCollectionSlug<'contents'>,
      }),
    // A new tour stop goes straight back into the tour being edited.
    (saved) =>
      router.push(
        (returnTo ? backToTourHref(returnTo, saved.id) : `/${lng}/content/${saved.id}`) as Route,
      ),
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <Title order={2}>{t('New content')}</Title>
        <ObjectPicker
          value={form.values.object}
          initial={initialObject}
          museum={museum}
          onChange={(id) => form.setFieldValue('object', id)}
          error={form.errors.object as string | undefined}
        />
        <ContentFields form={form} />
        <Group justify="end">
          <Button variant="default" onClick={() => router.back()} disabled={save.isPending}>
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t('Publish')}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
