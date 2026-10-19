'use client'

import { payloadSdk } from '@/payload-sdk'
import type { User } from '@/payload-types'
import { Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'

/** Own profile (shown only to the owner; `users.update` is self-only). */
export function ProfileForm({ user }: { user: Pick<User, 'id' | 'name' | 'bio'> }) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const form = useForm({
    initialValues: {
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      bio: user.bio ?? '',
    },
    validate: {
      firstName: (value) => (value.trim() ? null : t('Required')),
      lastName: (value) => (value.trim() ? null : t('Required')),
    },
  })
  const save = useSave(
    (values: typeof form.values) =>
      payloadSdk.update({
        collection: 'users',
        id: user.id,
        locale: SOURCE_LOCALE,
        data: {
          name: { firstName: values.firstName.trim(), lastName: values.lastName.trim() },
          bio: values.bio,
        },
      }),
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('First name')} required {...form.getInputProps('firstName')} />
        <TextInput label={t('Last name')} required {...form.getInputProps('lastName')} />
        <Textarea label={t('Bio')} autosize minRows={2} {...form.getInputProps('bio')} />
        <FormActions saving={save.isPending} />
      </Stack>
    </form>
  )
}
