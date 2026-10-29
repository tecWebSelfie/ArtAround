'use client'

import { Button } from '@mantine/core'
import { LogOut } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from './AuthProvider'

/**
 * Profile-page sign out. Goes through `AuthProvider` (not a server action) so
 * the client session mirror — and with it the NavBar account entry — clears
 * together with Payload's cookie; `router.refresh()` then re-renders the
 * viewer-scoped server components.
 */
export function SignOutButton({ label }: { label: string }) {
  const { logout } = useAuth()
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    setPending(true)
    try {
      await logout()
    } catch {
      // The provider already forgot the user; leave the profile anyway.
    }
    router.push(`/${lng}/navigator` as Route)
    router.refresh()
  }

  return (
    // Light red: reads as "leave" at a glance from the profile's top-right
    // corner, without the weight of a filled call to action.
    <Button
      variant="light"
      color="red"
      size="xs"
      rightSection={<LogOut size={14} />}
      loading={pending}
      onClick={() => void handleClick()}
    >
      {label}
    </Button>
  )
}
