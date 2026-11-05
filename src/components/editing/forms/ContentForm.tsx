'use client'

import { payloadSdk } from '@/payload-sdk'
import { Button, Group, Input, SegmentedControl, Stack, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { backToTourHref } from '@/lib/tour-picker'
import { saveCover, type CoverChange } from '../CoverImageInput'
import { ObjectPicker, SubjectPicker } from '../ObjectPicker'
import { SOURCE_LOCALE, useSave } from '../saving'
import {
  ContentFields,
  contentFieldValidators,
  NEW_CONTENT_RIGHTS,
  type ContentFormValues,
} from './ContentFields'

/**
 * New content editor (`/content/new`). Existing contents are edited inline on
 * their page (`ContentEditForm`), with the same fields (`ContentFields`).
 *
 * New contents are written about an object, or about a subject (an artist,
 * a movement or style, an event: the course specification's "associated
 * contents"). The create call passes `attachToObject` or `attachToSubject`,
 * and the server links the content in `objects.contents` or
 * `subjects.contents` without the author needing rights on either. A tour
 * stop is always about an object: the map needs a place to go. The body is
 * sent as HTML (`bodyHTML`) and converted to Lexical server-side.
 */
export function ContentForm({
  initialObject,
  initialSubject,
  museum,
  returnTo,
}: {
  initialObject?: { id: string; name: string } | null
  /** Preselected subject (`?subject=`, from a subject page's "Write about it"). */
  initialSubject?: { id: string; name: string } | null
  /** Writing a tour stop: only this museum's objects can be chosen. */
  museum?: { name: string; objectIds: string[] } | null
  /** Writing a tour stop: the tour editor to return to (`backToTourHref`). */
  returnTo?: string | null
}) {
  const { t } = useTranslation('editing')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  // What the content is about. Outside the form values, which `ContentFields`
  // shares with the edit form; checked on submit instead.
  const [about, setAbout] = useState<'object' | 'subject'>(
    initialSubject && !returnTo ? 'subject' : 'object',
  )
  const [subject, setSubject] = useState<string | null>(initialSubject?.id ?? null)
  const [subjectError, setSubjectError] = useState<string | null>(null)
  const form = useForm<ContentFormValues>({
    initialValues: {
      title: '',
      difficulty: 'easy',
      ...NEW_CONTENT_RIGHTS,
      price: null,
      bodyHTML: '',
      object: initialObject?.id ?? null,
    },
    validate: {
      ...contentFieldValidators(t),
      // Third-party texts aren't accepted: the author declares the text is theirs.
      rightsDeclared: (value) => (value ? null : t('Declare that the text is yours to publish it')),
    },
  })

  const [cover, setCover] = useState<CoverChange>(null)
  const save = useSave(
    async ({ object, rightsDeclared, ...values }: ContentFormValues) => {
      const title = values.title.trim()
      const coverId = await saveCover(cover, null, 'contentImages', title)
      return payloadSdk.create({
        collection: 'contents',
        locale: SOURCE_LOCALE,
        // `body` is required by the generated type but is produced on the
        // server from `bodyHTML` (see src/fields/richTextHtml.ts).
        data: {
          ...values,
          title,
          images: coverId ? [coverId] : [],
          attachToObject: about === 'object' ? object : null,
          attachToSubject: about === 'subject' ? subject : null,
          // The server stamps its own time; this only says the box was ticked.
          rightsDeclaredAt: rightsDeclared ? new Date().toISOString() : null,
        } as RequiredDataFromCollectionSlug<'contents'>,
      })
    },
    // A new tour stop goes straight back into the tour being edited.
    (saved) =>
      router.push(
        (returnTo ? backToTourHref(returnTo, saved.id) : `/${lng}/content/${saved.id}`) as Route,
      ),
  )

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (about === 'object' && !values.object) {
          return form.setFieldError('object', t('Choose the object'))
        }
        if (about === 'subject' && !subject) return setSubjectError(t('Choose the subject'))
        save.mutate(values)
      })}
    >
      <Stack gap="md">
        <Title order={2}>{t('New content')}</Title>
        {/* A tour stop needs a work on the map: no choice in the tour flow.
            Labelled like `VisibilityInput`, the other choice of this form. */}
        {!returnTo && (
          <Input.Wrapper label={t('What is it about?')}>
            {/* Its own row under the label: the control is inline-flex. */}
            <SegmentedControl
              mt={4}
              className="flex w-fit"
              value={about}
              onChange={(value) => setAbout(value as 'object' | 'subject')}
              data={[
                { value: 'object', label: t('A work') },
                { value: 'subject', label: t('An artist, style or event') },
              ]}
            />
          </Input.Wrapper>
        )}
        {about === 'object' ? (
          <ObjectPicker
            value={form.values.object}
            initial={initialObject}
            museum={museum}
            onChange={(id) => form.setFieldValue('object', id)}
            error={form.errors.object as string | undefined}
          />
        ) : (
          <SubjectPicker
            value={subject}
            initial={initialSubject}
            onChange={(id) => {
              setSubject(id)
              setSubjectError(null)
            }}
            error={subjectError ?? undefined}
          />
        )}
        <ContentFields form={form} cover={{ change: cover, onChange: setCover }} isNew />
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
