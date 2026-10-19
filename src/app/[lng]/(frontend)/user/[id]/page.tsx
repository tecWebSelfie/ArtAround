import { getT } from '@/i18n.server'
import { asViewer, getSession } from '@/lib/session'
import { Button } from '@mantine/core'
import { LogOut } from 'lucide-react'
import { signOut } from '../../(auth)/actions'
import { UserPage } from './UserPage'

export default async function getUserById(props: PageProps<'/[lng]/user/[id]'>) {
  const { payload, user: viewer } = await getSession()
  const { lng, id } = await props.params
  // As the visitor: the email is only returned to its owner.
  const user = await payload.findByID({
    id,
    collection: 'users',
    ...(await asViewer()),
  })
  const isSelf = String(viewer?.id) === String(user.id)
  const { t } = await getT('editing')

  return (
    <UserPage
      user={user}
      isSelf={isSelf}
      accountActions={
        isSelf && (
          // Server action: Payload's Local API logout clears the auth cookie.
          <form action={signOut}>
            <input type="hidden" name="lng" value={lng} />
            <Button type="submit" variant="default" size="xs" leftSection={<LogOut size={14} />}>
              {t('Sign out')}
            </Button>
          </form>
        )
      }
    />
  )
}
