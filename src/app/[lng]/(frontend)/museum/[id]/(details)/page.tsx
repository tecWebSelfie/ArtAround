import { lexicalToHTML } from '@/lib/richtext'
import { museumNavigationEntry } from '@/lib/navigation-entry'
import { asViewer, can, getSession } from '@/lib/session'
import config from '@/payload.config'
import { getPayload } from 'payload'
import MuseumPage from './MuseumPage'
import type { Metadata } from 'next'
import { cache } from 'react'

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const museums = await payload.find({
    collection: 'museums',
    limit: 100,
    pagination: false,
  })

  return museums.docs.map((museum) => ({
    id: museum.id,
  }))
}

/**
 * The museum, read once per request (React `cache`) for the page and its
 * metadata. As the visitor, so nested paid contents keep their body hidden.
 * No `locale`: the page reads the source locale (`en`), which is also what
 * the metadata form edits, so the same document seeds the form.
 */
const readMuseum = cache(async (id: string) => {
  const [{ payload }, viewer] = await Promise.all([getSession(), asViewer()])
  return payload.findByID({ collection: 'museums', id, depth: 2, ...viewer })
})

/** The tab names the museum. */
export async function generateMetadata(props: PageProps<'/[lng]/museum/[id]'>): Promise<Metadata> {
  const { id } = await props.params
  const museum = await readMuseum(id).catch(() => null)
  return museum ? { title: museum.name } : {}
}

export default async function Museum(props: PageProps<'/[lng]/museum/[id]'>) {
  const { user } = await getSession()
  const { lng, id } = await props.params
  // The permissions only need the id, so they are read alongside the museum.
  const [museum, canEditDetails, canManageMap] = await Promise.all([
    readMuseum(id),
    can('museums', id, 'update', 'name'),
    can('museums', id, 'update', 'map'),
  ])

  return (
    <MuseumPage
      museum={museum}
      navigationHref={museumNavigationEntry(lng, museum)}
      editing={{
        lng,
        canEditDetails,
        canManageMap,
        isSignedIn: Boolean(user),
        // Only what the form needs: the full doc (map JSON) must not reach the client.
        source: {
          id: museum.id,
          name: museum.name,
          shortDescription: museum.shortDescription,
          email: museum.email,
          location: museum.location,
          brandColor: museum.brandColor,
          descriptionHTML: lexicalToHTML(museum.description),
        },
      }}
    />
  )
}
