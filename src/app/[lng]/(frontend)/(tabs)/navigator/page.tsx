'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import NavigatorHomePage from './NavigatorPage'

export default function NavigatorHome() {
  const router = useRouter()
  return <NavigatorHomePage onOptionSubmit={(value) => router.push(value as Route)} />
}
