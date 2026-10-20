import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { ObjectModal as Modal } from './Modal'

// NOTE: no generateStaticParams here. This is an INTERCEPTED route — its URL
// is /{lng}/object/[objectId] (the (..)(..) pops out of
// museum/[id]/@object), so it has no museum `id` param and only renders on a
// client-side navigation FROM the museum page; hard loads of that URL are
// served by src/app/[lng]/(frontend)/object/[id]/page.tsx instead. Enumerating
// params here (the previous version read the museum id from a param that does
// not exist on this route) failed `next build` type validation.

export default async function ObjectModal({
  params,
}: {
  params: Promise<{ lng: string; objectId: string }>
}) {
  const payload = await getPayload({ config })
  const { objectId } = await params

  const object = await payload.findByID({
    collection: 'objects',
    id: objectId,
    depth: 2,
  })
  return (
    <Modal size="lg" centered>
      <ObjectDetailsContent object={object} />
    </Modal>
  )
}
