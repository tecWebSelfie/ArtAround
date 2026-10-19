import type { Config, User } from '@/payload-types'
import { PayloadSDK } from '@payloadcms/sdk'

/**
 * Thin, typed wrapper around Payload's built-in auth REST endpoints
 * (`/api/users/{login,logout,me}` + `POST /api/users`). Those endpoints speak
 * httpOnly cookies, so every call is same-origin and sends `credentials`.
 *
 * No credentials are ever read from or written to `localStorage`: the session
 * lives entirely in the `payload-token` cookie set by Payload.
 */

/**
 * Browser-scoped SDK instance. `baseURL` is relative (not the absolute
 * `NEXT_PUBLIC_PAYLOAD_URL` used by `src/payload-sdk.ts`) so auth calls always
 * hit the current origin and carry the httpOnly session cookie.
 */
const authSdk = new PayloadSDK<Config>({
  baseURL: '/api',
  baseInit: { credentials: 'include' },
})

/** The authenticated user as returned by `/api/users/me`. */
export type AuthUser = User

export type LoginInput = {
  /** Email **or** username — Payload matches either. */
  identifier: string
  password: string
}

export type RegisterInput = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}

type PayloadErrorBody = {
  message?: string
  errors?: { field?: string; message?: string }[]
}

/** Turn a Payload error response into a single human-readable message. */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as PayloadErrorBody | null
  const details = body?.errors
    ?.map((error) => error.message)
    .filter((message): message is string => Boolean(message))

  if (details?.length) {
    return details.join('. ')
  }
  if (body?.message) {
    return body.message
  }
  return fallback
}

/** Errors from the auth client carry the server message for the UI to render. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/** Current session, or `null` for visitors. Never throws on a 401/403. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    // Payload returns `{ user: null }` for visitors, but the SDK types `user`
    // as non-nullable — hence the cast. Auth failures also surface as
    // `PayloadSDKError`, so both paths collapse to `null` here.
    const result = await authSdk.me({ collection: 'users' }, { cache: 'no-store', signal })
    return (result.user as AuthUser | null) ?? null
  } catch {
    return null
  }
}

export async function loginRequest(input: LoginInput): Promise<AuthUser> {
  const res = await fetch('/api/users/login', {
    body: JSON.stringify({ password: input.password, username: input.identifier }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!res.ok) {
    throw new AuthError(await readErrorMessage(res, 'Unable to sign in. Please try again.'))
  }

  const data = (await res.json()) as { user: AuthUser }
  return data.user
}

/**
 * Creates the account through the standard Payload `POST /api/users` endpoint.
 * Privileged fields are stripped server-side (see `sanitizePublicSignup`), so
 * only the profile fields below are ever accepted from this client.
 */
export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const res = await fetch('/api/users', {
    body: JSON.stringify({
      email: input.email,
      name: { firstName: input.firstName, lastName: input.lastName },
      password: input.password,
      username: input.username,
    }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!res.ok) {
    throw new AuthError(await readErrorMessage(res, 'Unable to create your account.'))
  }

  const data = (await res.json()) as { doc: AuthUser }
  return data.doc
}

/** Clears the session cookie. */
export async function logoutRequest(): Promise<void> {
  const res = await fetch('/api/users/logout', {
    credentials: 'include',
    method: 'POST',
  })

  if (!res.ok) {
    throw new AuthError(await readErrorMessage(res, 'Unable to sign out. Please try again.'))
  }
}
