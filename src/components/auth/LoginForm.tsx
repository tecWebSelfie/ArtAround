'use client'

import {
  Alert,
  Anchor,
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import Link from 'next/link'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useT } from 'next-i18next/client'
import { useState } from 'react'

import { useAuth } from './AuthProvider'
import { useReturnTo } from './useReturnTo'

type LoginFormValues = {
  identifier: string
  password: string
}

/**
 * Email-or-username sign in against `POST /api/users/login`.
 * Payload accepts a single `username` field and matches it against either
 * column when `loginWithUsername` is enabled.
 */
export function LoginForm() {
  const { t } = useT(undefined, { keyPrefix: 'auth' })
  const { login } = useAuth()
  const { lng } = useParams()
  const router = useRouter()
  const { returnTo, nextQuery } = useReturnTo()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    initialValues: {
      identifier: '',
      password: '',
    },
    validate: {
      identifier: (value) => (value.trim() ? null : t('errors.identifierRequired')),
      password: (value) => (value ? null : t('errors.passwordRequired')),
    },
  })

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null)
    setLoading(true)

    try {
      await login({ identifier: values.identifier.trim(), password: values.password })
      router.push(returnTo)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('errors.generic'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Same single column as "Plan my visit" (DESIGN.md → Layout): h1 with a
          dimmed intro, the fields, one full-width primary action. */}
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t('signInTitle')}</Title>
          <Text c="dimmed">{t('signInSubtitle')}</Text>
        </Stack>

        <TextInput
          autoComplete="username"
          data-autofocus
          label={t('identifier')}
          placeholder={t('identifierPlaceholder')}
          required
          {...form.getInputProps('identifier')}
        />

        <PasswordInput
          autoComplete="current-password"
          label={t('password')}
          required
          {...form.getInputProps('password')}
        />

        {/* Server errors (Payload's message) sit right above the action they block. */}
        {error && <Alert color="orange">{error}</Alert>}

        <Button fullWidth loading={loading} type="submit">
          {t('signIn')}
        </Button>

        <Group gap={4} justify="center">
          <Text size="sm">{t('noAccount')}</Text>
          <Anchor component={Link} href={`/${lng}/signup${nextQuery}` as Route} size="sm">
            {t('signUpLink')}
          </Anchor>
        </Group>
      </Stack>
    </form>
  )
}
