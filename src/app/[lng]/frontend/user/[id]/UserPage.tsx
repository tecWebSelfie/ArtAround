import { isPopulated } from '@/lib/isPopulated'
import { User } from '@/payload-types'
import { Avatar, Stack, Title } from '@mantine/core'

export const UserPage = async ({ user }: { user: User }) => {
  return (
    <Stack>
      <Avatar
        src={isPopulated(user.avatar) ? (user.avatar.url ?? undefined) : undefined}
        alt={user.name.fullName}
      />

      <Title>{user.name.fullName}</Title>
    </Stack>
  )
}
