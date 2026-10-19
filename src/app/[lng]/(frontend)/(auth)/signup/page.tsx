import { getSession } from '@/lib/session'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignUpForm } from '../AuthForms'

export default async function SignupPage({ params }: PageProps<'/[lng]/signup'>) {
  const { lng } = await params
  const { user } = await getSession()
  if (user) redirect(`/${lng}/user/${user.id}` as Route)
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
