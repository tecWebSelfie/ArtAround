import { isPopulated } from '@/lib/isPopulated'
import { User } from '@/payload-types'
import { Avatar, Group, Indicator, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { Verified } from 'lucide-react'

export const UserPage = async ({ user }: { user: User }) => {
  return (
    <Stack mx={{ base: 'md', sm: 'xl' }} mt="sm">
      <Group align="center" gap={'xs'} justify="strech">
        <Indicator
          color="transparent"
          offset={6}
          position="bottom-end"
          label={
            <ThemeIcon size="1.3em" radius="xl" color="blue" variant="filled">
              <Verified size={'80%'} />
            </ThemeIcon>
          }
        >
          <Avatar
            className="border-blue-400 border-3"
            name={user.name.fullName}
            color="initials"
            src={isPopulated(user.avatar) ? (user.avatar.url ?? undefined) : undefined}
            alt={user.name.fullName}
          />
        </Indicator>
        <Stack justify="start" gap={0}>
          <Title size="h2">{user.name.fullName}</Title>
          <Text>pippo</Text>
        </Stack>
      </Group>
    </Stack>
  )
}
