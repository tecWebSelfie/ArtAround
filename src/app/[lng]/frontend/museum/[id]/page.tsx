import { getPayload } from 'payload'
import config from '@/payload.config'
import MuseumPage from './MuseumPage'

export default async function Museum(props: PageProps<'/museum/[id]'>) {
  const payload = await getPayload({ config })
  const { id } = await props.params
  const museum = await payload.findByID({ collection: 'museums', id, depth: 2 })

  return <MuseumPage museum={museum} />
}
