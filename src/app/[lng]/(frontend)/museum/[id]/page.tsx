import { lexicalToHTML } from '@/lib/richtext'
import { asViewer, can, getSession } from '@/lib/session'
import config from '@/payload.config'
import { getPayload } from 'payload'
import MuseumPage from './MuseumPage'

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

export default async function Museum(props: PageProps<'/[lng]/museum/[id]'>) {
  const { payload, user } = await getSession()
  const { lng, id } = await props.params
  // Read as the visitor so nested paid contents keep their body hidden.
  // No `locale`: the page reads the source locale (`en`), which is also what
  // the metadata form edits, so the same document seeds the form.
  const museum = await payload.findByID({
    collection: 'museums',
    id,
    depth: 2,
    ...(await asViewer()),
  })
  const [canEditDetails, canManageMap] = await Promise.all([
    can('museums', id, 'update', 'name'),
    can('museums', id, 'update', 'map'),
  ])

  return (
    <MuseumPage
      museum={museum}
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
          descriptionHTML: lexicalToHTML(museum.description),
        },
      }}
    />
  )
}
