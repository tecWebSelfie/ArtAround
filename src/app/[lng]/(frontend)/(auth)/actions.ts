'use server'

import config from '@/payload.config'
import { login, logout } from '@payloadcms/next/auth'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getPayload, ValidationError } from 'payload'

/**
 * Minimal sign-in / sign-up / sign-out, entirely server-side through Payload
 * (Local API + `@payloadcms/next/auth`, which sets and clears the auth
 * cookie). Intentionally small: a dedicated auth workstream will replace it.
 */

export type AuthState = { error?: string } | undefined

/** Only same-site relative paths, so `?next=` can't redirect off the app. */
function safeNext(value: FormDataEntryValue | null, lng: string): Route {
  const next = typeof value === 'string' ? value : ''
  return (next.startsWith('/') && !next.startsWith('//') ? next : `/${lng}/navigator`) as Route
}

const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const lng = field(form, 'lng')
  try {
    await login({
      collection: 'users',
      config,
      username: field(form, 'username'),
      password: String(form.get('password') ?? ''),
    })
  } catch {
    // Payload doesn't reveal which part was wrong; neither do we.
    return { error: 'invalid-credentials' }
  }
  redirect(safeNext(form.get('next'), lng))
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const lng = field(form, 'lng')
  const username = field(form, 'username')
  const password = String(form.get('password') ?? '')
  const payload = await getPayload({ config })
  try {
    // As an anonymous visitor: `users.create` is public, and privileged
    // fields are stripped by the collection's own hook.
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      data: {
        username,
        password,
        email: field(form, 'email') || undefined,
        name: {
          firstName: field(form, 'firstName'),
          lastName: field(form, 'lastName'),
          fullName: '',
        },
      },
    })
    await login({ collection: 'users', config, username, password })
  } catch (error) {
    return {
      error:
        error instanceof ValidationError
          ? (error.data.errors[0]?.message ?? error.message)
          : 'signup-failed',
    }
  }
  redirect(safeNext(form.get('next'), lng))
}

export async function signOut(form: FormData) {
  await logout({ config })
  redirect(`/${field(form, 'lng') || 'en'}/navigator` as Route)
}
