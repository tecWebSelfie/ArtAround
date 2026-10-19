'use client'

import {
  Alert,
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { useTranslation } from 'react-i18next'
import { signIn, signUp, type AuthState } from './actions'

/**
 * Sign-in and sign-up forms posting to server actions (`./actions.ts`).
 * `next` (from `?next=`) and `lng` travel as hidden fields so the action can
 * return the visitor where they started, in their language.
 */
function useAuthContext() {
  const { lng } = useParams<{ lng: string }>()
  const next = useSearchParams().get('next') ?? ''
  return { lng, next }
}

function ErrorAlert({ state }: { state: AuthState }) {
  const { t } = useTranslation('editing')
  if (!state?.error) return null
  const known: Record<string, string> = {
    'invalid-credentials': t('Wrong username or password.'),
    'signup-failed': t('Could not create the account. Try again.'),
  }
  return (
    <Alert color="red" role="alert">
      {known[state.error] ?? state.error}
    </Alert>
  )
}

export function SignInForm() {
  const { t } = useTranslation('editing')
  const { lng, next } = useAuthContext()
  const [state, action, pending] = useActionState(signIn, undefined)
  return (
    <Paper withBorder p="lg" radius="md" maw={420} mx="auto" mt="xl" w="100%">
      <form action={action}>
        <Stack>
          <Title order={2}>{t('Sign in')}</Title>
          <ErrorAlert state={state} />
          <input type="hidden" name="lng" value={lng} />
          <input type="hidden" name="next" value={next} />
          <TextInput name="username" label={t('Username')} autoComplete="username" required />
          <PasswordInput
            name="password"
            label={t('Password')}
            autoComplete="current-password"
            required
          />
          <Button type="submit" loading={pending}>
            {t('Sign in')}
          </Button>
          <Text size="sm">
            {t('New to ArtAround?')}{' '}
            <Anchor
              component={Link}
              href={`/${lng}/signup?next=${encodeURIComponent(next)}` as Route}
            >
              {t('Create an account')}
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  )
}

export function SignUpForm() {
  const { t } = useTranslation('editing')
  const { lng, next } = useAuthContext()
  const [state, action, pending] = useActionState(signUp, undefined)
  return (
    <Paper withBorder p="lg" radius="md" maw={420} mx="auto" mt="xl" w="100%">
      <form action={action}>
        <Stack>
          <Title order={2}>{t('Create an account')}</Title>
          <ErrorAlert state={state} />
          <input type="hidden" name="lng" value={lng} />
          <input type="hidden" name="next" value={next} />
          <TextInput name="firstName" label={t('First name')} autoComplete="given-name" required />
          <TextInput name="lastName" label={t('Last name')} autoComplete="family-name" required />
          <TextInput name="username" label={t('Username')} autoComplete="username" required />
          <TextInput
            name="email"
            type="email"
            label={t('Email')}
            description={t('Optional')}
            autoComplete="email"
          />
          <PasswordInput
            name="password"
            label={t('Password')}
            autoComplete="new-password"
            required
          />
          <Button type="submit" loading={pending}>
            {t('Create an account')}
          </Button>
          <Text size="sm">
            {t('Already have an account?')}{' '}
            <Anchor
              component={Link}
              href={`/${lng}/login?next=${encodeURIComponent(next)}` as Route}
            >
              {t('Sign in')}
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  )
}
