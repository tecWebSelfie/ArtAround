import { getT } from '@/i18n.server'
import { museumScope } from '@/lib/museum-mode'
import { asViewer, getSession } from '@/lib/session'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { UserPage } from './UserPage'
import { displayName } from '@/lib/display-name'
import type { Metadata } from 'next'
import { cache } from 'react'

/**
 * The profile, read once per request (React `cache`) for the page and its
 * metadata. As the visitor: the email is only returned to its owner. Museum
 * mode (`scope`): the tour and content carousels keep only the locked
 * museum's work, like every other list in the app.
 */
const readUser = cache(async (id: string) => {
  const [{ payload }, scope, viewer] = await Promise.all([getSession(), museumScope(), asViewer()])
  return payload.findByID({
    id,
    collection: 'users',
    ...(scope && {
      joins: {
        authoredTours: { where: { museum: { equals: scope.museumId } } },
        authoredContents: { where: { id: { in: scope.contentIds } } },
      },
    }),
    ...viewer,
  })
})

/** The tab names the person. */
export async function generateMetadata(props: PageProps<'/[lng]/user/[id]'>): Promise<Metadata> {
  const { id } = await props.params
  const user = await readUser(id).catch(() => null)
  return user ? { title: displayName(user) } : {}
}

export default async function getUserById(props: PageProps<'/[lng]/user/[id]'>) {
  const [{ user: viewer }, { id }] = await Promise.all([getSession(), props.params])
  const user = await readUser(id)
  const isSelf = String(viewer?.id) === String(user.id)
  const { t } = await getT('editing')

  return (
    <UserPage
      user={user}
      isSelf={isSelf}
      accountActions={
        // Client-side, so the NavBar's session mirror clears together with the cookie.
        isSelf && <SignOutButton label={t('Sign out')} />
      }
    />
  )
}
