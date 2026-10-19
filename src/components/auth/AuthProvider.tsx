'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  registerRequest,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@/lib/auth-client'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  /** The signed-in user, or `null` for visitors. */
  user: AuthUser | null
  /** `loading` only during the initial `/api/users/me` probe. */
  status: AuthStatus
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
  /** Re-reads the session from Payload (useful after server-side changes). */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Client-side session store for the frontend app. Payload keeps the real
 * session in an httpOnly cookie; this provider only mirrors `/api/users/me`
 * into React state so UI (navbar, forms, …) can react to sign-in/out.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    try {
      const nextUser = await fetchCurrentUser()
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'unauthenticated')
    } catch {
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    let active = true

    void fetchCurrentUser()
      .then((nextUser) => {
        if (!active) return
        setUser(nextUser)
        setStatus(nextUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (active) setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const nextUser = await loginRequest(input)
    setUser(nextUser)
    setStatus('authenticated')
    return nextUser
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    await registerRequest(input)
    // Payload's create endpoint does not open a session, so sign in right away
    // instead of bouncing the visitor back to the login form.
    const nextUser = await loginRequest({
      identifier: input.username,
      password: input.password,
    })
    setUser(nextUser)
    setStatus('authenticated')
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      // Even if the network call fails, forget the local mirror so the UI
      // cannot show a stale authenticated state.
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ login, logout, refresh, register, status, user }),
    [login, logout, refresh, register, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }

  return context
}
