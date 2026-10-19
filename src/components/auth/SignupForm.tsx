'use client'

import {
  Alert,
  Anchor,
  Button,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useT } from 'next-i18next/client'
import { useState } from 'react'

import { useAuth } from './AuthProvider'

type SignupFormValues = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/

/**
 * Self-registration against `POST /api/users`.
 *
 * The collection's public `create` access is paired with
 * `sanitizePublicSignup`, which strips privileged fields (`isSuperAdmin`,
 * `roles`, …) from anonymous requests, so only these profile fields are ever
 * accepted. On success we immediately open a session and send the visitor
 * into the app.
 */
export function SignupForm() {
  const { t } = useT(undefined, { keyPrefix: 'auth' })
  const { register } = useAuth()
  const { lng } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SignupFormValues>({
    initialValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      firstName: (value) => (value.trim() ? null : t('errors.firstNameRequired')),
      lastName: (value) => (value.trim() ? null : t('errors.lastNameRequired')),
      username: (value) => {
        const username = value.trim()
        if (!username) return t('errors.usernameRequired')
        if (username.length < 3) return t('errors.usernameTooShort')
        if (!USERNAME_PATTERN.test(username)) return t('errors.usernameInvalid')
        return null
      },
      email: (value) => {
        if (!value.trim()) return t('errors.emailRequired')
        if (!EMAIL_PATTERN.test(value.trim())) return t('errors.emailInvalid')
        return null
      },
      password: (value) => {
        if (!value) return t('errors.passwordRequired')
        if (value.length < 8) return t('errors.passwordTooShort')
        return null
      },
      confirmPassword: (value, values) =>
        value === values.password ? null : t('errors.passwordMismatch'),
    },
  })

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null)
    setLoading(true)

    try {
      await register({
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
        username: values.username.trim(),
      })
      router.push(`/${lng}/navigator`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('errors.generic'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={1} size="h2">
            {t('signUpTitle')}
          </Title>
          <Text c="dimmed" size="sm">
            {t('signUpSubtitle')}
          </Text>
        </Stack>

        {error ? (
          <Alert color="red" icon={<AlertCircle size={18} />} title={t('errors.title')}>
            {error}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput
            autoComplete="given-name"
            label={t('firstName')}
            required
            {...form.getInputProps('firstName')}
          />
          <TextInput
            autoComplete="family-name"
            label={t('lastName')}
            required
            {...form.getInputProps('lastName')}
          />
        </SimpleGrid>

        <TextInput
          autoComplete="username"
          description={t('usernameHint')}
          label={t('username')}
          required
          {...form.getInputProps('username')}
        />

        <TextInput
          autoComplete="email"
          label={t('email')}
          required
          type="email"
          {...form.getInputProps('email')}
        />

        <PasswordInput
          autoComplete="new-password"
          description={t('passwordHint')}
          label={t('password')}
          required
          {...form.getInputProps('password')}
        />

        <PasswordInput
          autoComplete="new-password"
          label={t('confirmPassword')}
          required
          {...form.getInputProps('confirmPassword')}
        />

        <Button fullWidth loading={loading} type="submit">
          {t('signUp')}
        </Button>

        <Group gap={4} justify="center">
          <Text size="sm">{t('haveAccount')}</Text>
          <Anchor component={Link} href={`/${lng}/login` as Route} size="sm">
            {t('signInLink')}
          </Anchor>
        </Group>
      </Stack>
    </form>
  )
}
