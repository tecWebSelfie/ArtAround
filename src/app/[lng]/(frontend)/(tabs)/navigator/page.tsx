'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import NavigatorHomePage from './NavigatorPage'

/** Search results open with client-side navigation (no full page reload). */
export default function NavigatorHome() {
  const router = useRouter()
  return <NavigatorHomePage onNavigate={(href) => router.push(href as Route)} />
}
