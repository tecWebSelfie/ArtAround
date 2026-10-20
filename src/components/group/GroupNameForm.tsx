'use client'

import { GroupNameForm as Schema } from '@/lib/group'
import { Alert, Button, Stack, TextInput } from '@mantine/core'
import { schemaResolver, useForm } from '@mantine/form'
import { useLocalStorage } from '@mantine/hooks'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The one field a group needs: the name others see. Validated with the same
 * zod schema as `/api/rooms` (`GroupNameForm`), and remembered on this device
 * only, so the next group starts already filled in.
 */
export function GroupNameForm({
  submitLabel,
  onSubmit,
  busy = false,
  error,
  children,
}: {
  submitLabel: string
  onSubmit: (name: string) => void
  busy?: boolean
  error?: ReactNode
  /** More fields below the name (e.g. the host's results option). */
  children?: ReactNode
}) {
  const { t } = useTranslation('group')
  // Rendered only in the browser (a modal, or the join page after mount), so the
  // remembered name can be read on the first render.
  const [remembered, remember] = useLocalStorage({
    key: 'aa-name',
    defaultValue: '',
    getInitialValueInEffect: false,
  })
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: remembered },
    validate: schemaResolver(Schema, { sync: true }),
  })

  return (
    <form
      onSubmit={form.onSubmit(({ name }) => {
        remember(name.trim())
        onSubmit(name.trim())
      })}
    >
      <Stack gap="md">
        <TextInput
          label={t('Your name')}
          description={t('Shown to the people in your group')}
          maxLength={30}
          data-autofocus
          key={form.key('name')}
          {...form.getInputProps('name')}
          error={form.errors.name ? t('Enter a name of up to 30 characters') : undefined}
        />
        {children}
        {error && (
          <Alert color="orange" variant="light">
            {error}
          </Alert>
        )}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </Stack>
    </form>
  )
}
