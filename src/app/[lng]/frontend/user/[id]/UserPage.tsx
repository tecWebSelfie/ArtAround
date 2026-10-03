import { User } from '@/payload-types'
import { Avatar, Stack, Title } from '@mantine/core'

export const UserPage = async ({ user }: { user: User }) => {
  return (
    <Stack>
      <Avatar
        src={typeof user.avatar === 'object' ? user.avatar?.url : undefined}
        alt={user.name.fullName}
      />

      <Title>{user.name.fullName}</Title>
    </Stack>
  )
}
