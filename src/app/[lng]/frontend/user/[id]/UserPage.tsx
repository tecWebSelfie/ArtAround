import { User } from '@/payload-types'
import { Stack } from '@mantine/core'

export const UserPage = async ({ user }: { user: User }) => {
  return (
    <Stack>
      <h1>User Page</h1>
    </Stack>
  )
}
