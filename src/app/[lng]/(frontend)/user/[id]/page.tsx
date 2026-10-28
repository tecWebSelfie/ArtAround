import { getT } from '@/i18n.server'
import { museumScope } from '@/lib/museum-mode'
import { asViewer, getSession } from '@/lib/session'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { UserPage } from './UserPage'

export default async function getUserById(props: PageProps<'/[lng]/user/[id]'>) {
  const { payload, user: viewer } = await getSession()
  const { id } = await props.params
  // Museum mode: the profile's tour and content carousels keep only the
  // locked museum's work, like every other list in the app.
  const scope = await museumScope()
  // As the visitor: the email is only returned to its owner.
  const user = await payload.findByID({
    id,
    collection: 'users',
    ...(scope && {
      joins: {
        authoredTours: { where: { museum: { equals: scope.museumId } } },
        authoredContents: { where: { id: { in: scope.contentIds } } },
      },
    }),
    ...(await asViewer()),
  })
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
