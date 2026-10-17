import config from '@/payload.config'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getPayload } from 'payload'

export default async function ObjectModal({
  params,
}: {
  params: Promise<{ objectId: string }>
}) {
  const { objectId } = await params
  const payload = await getPayload({ config })
  const object = await payload.findByID({
    collection: 'objects',
    id: objectId,
  })

  return <ObjectDetailsContent object={object} />
}
