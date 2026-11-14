import { getT } from '@/i18n.server'
import { museumScope } from '@/lib/museum-mode'
import { asViewer, getSession } from '@/lib/session'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { UserPage } from './UserPage'
import { displayName } from '@/lib/display-name'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

/**
 * The profile, read once per request (React `cache`) for the page and its
 * metadata. As the visitor: the email is only returned to its owner.
 *
 * Tours follow the list rule (`LISTED_TOURS`, set on the `authoredTours`
 * join itself in `Users.ts`): planned visits and visit copies stay off it.
 *
 * `museumOnly` (museum mode, unless the visitor picked "All"): the tour and
 * content joins keep only the locked museum's work. The page shows that
 * filter as a visible control (`ProfileMuseumFilter`), so a tour the filter
 * hides never just seems missing.
 */
const readUser = cache(async (id: string, museumOnly: boolean) => {
  const [{ payload }, scope, viewer] = await Promise.all([getSession(), museumScope(), asViewer()])
  const inMuseum = museumOnly && scope
  // An unknown or deleted id is a 404, not an error page.
  const user = await payload
    .findByID({
      id,
      collection: 'users',
      joins: {
        authoredTours: {
          sort: '-createdAt',
          ...(inMuseum && { where: { museum: { equals: scope.museumId } } }),
        },
        authoredContents: {
          sort: '-createdAt',
          ...(inMuseum && { where: { id: { in: scope.contentIds } } }),
        },
      },
      ...viewer,
    })
    .catch(() => notFound())
  return { user, scope }
})

/** `?scope=all` lifts the museum filter; any other value (or none) keeps it. */
const museumOnlyParam = (scope: string | string[] | undefined) => scope !== 'all'

/** The tab names the person. */
export async function generateMetadata(props: PageProps<'/[lng]/user/[id]'>): Promise<Metadata> {
  const [{ id }, { scope }] = await Promise.all([props.params, props.searchParams])
  const read = await readUser(id, museumOnlyParam(scope)).catch(() => null)
  return read ? { title: displayName(read.user) } : {}
}

export default async function getUserById(props: PageProps<'/[lng]/user/[id]'>) {
  const [{ user: viewer }, { id }, { scope: scopeParam }] = await Promise.all([
    getSession(),
    props.params,
    props.searchParams,
  ])
  const museumOnly = museumOnlyParam(scopeParam)
  // Started before the translations, so the two loads overlap.
  const read = readUser(id, museumOnly)
  const { t } = await getT('editing')
  const { user, scope } = await read
  const isSelf = String(viewer?.id) === String(user.id)

  return (
    <UserPage
      user={user}
      isSelf={isSelf}
      // Only in museum mode: the filter the carousels below follow.
      museumFilter={scope ? { name: scope.name, museumOnly } : undefined}
      accountActions={
        // Client-side, so the NavBar's session mirror clears together with the cookie.
        isSelf && <SignOutButton label={t('Sign out')} />
      }
    />
  )
}
