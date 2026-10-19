import { getSession } from '@/lib/session'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInForm } from '../AuthForms'

/** Already signed-in visitors go straight to their profile. */
export default async function LoginPage({ params }: PageProps<'/[lng]/login'>) {
  const { lng } = await params
  const { user } = await getSession()
  if (user) redirect(`/${lng}/user/${user.id}` as Route)
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
