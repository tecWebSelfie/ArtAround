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
  const payload = await getPayload({ config })
  const { id } = await props.params
  const museum = await payload.findByID({ collection: 'museums', id, depth: 2 })

  return <MuseumPage museum={museum} />
}
