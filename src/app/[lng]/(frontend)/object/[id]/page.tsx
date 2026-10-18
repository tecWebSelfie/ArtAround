import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getLocalizedPageDocument } from '@/lib/localized-page'

export default async function Object({ params }: PageProps<'/[lng]/object/[id]'>) {
  const { lng, id } = await params
  const object = await getLocalizedPageDocument('objects', id, lng)
  return <ObjectDetailsContent object={object} />
}
