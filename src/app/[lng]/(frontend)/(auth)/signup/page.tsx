import { SignupForm } from '@/components/auth/SignupForm'
import { getSession } from '@/lib/session'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

/** Already signed-in visitors go straight to their profile. */
export default async function SignupPage({ params }: PageProps<'/[lng]/signup'>) {
  const { lng } = await params
  const { user } = await getSession()
  if (user) redirect(`/${lng}/user/${user.id}` as Route)
  return (
    // The form reads `?next=` (useSearchParams), which needs a Suspense boundary.
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
