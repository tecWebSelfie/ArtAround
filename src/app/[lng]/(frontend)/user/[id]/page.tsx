import config from '@/payload.config'
import { getPayload } from 'payload'
import { UserPage } from './UserPage'

export default async function getUserById(props: PageProps<'/[lng]/user/[id]'>) {
  const payload = await getPayload({ config })
  const { id } = await props.params
  const user = await payload.findByID({
    id,
    collection: 'users',
  })

  return <UserPage user={user} />
}
