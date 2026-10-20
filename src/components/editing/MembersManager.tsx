'use client'

import type { MuseumRole } from '@/fields/MuseumFunction'
import { payloadSdk } from '@/payload-sdk'
import { UserPicker } from './UserPicker'
import { ActionIcon, Button, Group, Paper, Select, Stack, Text, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSave } from './saving'

export type StaffMember = {
  membershipId: string
  userId: string
  name: string
  username: string
  role: MuseumRole
}

/**
 * Staff of one museum. Every change is a typed CRUD call on
 * `user-museum-memberships`; the collection's access rules (`canManage`)
 * decide who may grant what, so `grantable` (curators: verified; director:
 * curator + verified) only shapes the UI. Rows outside it are read-only.
 */
export function MembersManager({
  museumId,
  members,
  grantable,
  viewerId,
}: {
  museumId: string
  members: StaffMember[]
  grantable: MuseumRole[]
  viewerId: string
}) {
  const { t } = useTranslation('editing')
  const roleLabel: Record<MuseumRole, string> = {
    director: t('Director'),
    curator: t('Curator'),
    verified: t('Verified creator'),
  }
  const roleOptions = grantable.map((role) => ({ value: role, label: roleLabel[role] }))

  const changeRole = useSave(({ id, role }: { id: string; role: MuseumRole }) =>
    payloadSdk.update({
      collection: 'user-museum-memberships',
      id,
      data: { role },
    }),
  )
  const revoke = useSave((id: string) =>
    payloadSdk.delete({ collection: 'user-museum-memberships', id }),
  )

  const invite = useForm({
    initialValues: { username: '', role: grantable.at(-1) ?? null },
    validate: {
      username: (value) => (value.trim() ? null : t('Required')),
      role: (value) => (value ? null : t('Required')),
    },
  })
  const add = useSave(
    async ({ username, role }: typeof invite.values) => {
      const found = await payloadSdk.find({
        collection: 'users',
        where: { username: { equals: username.trim() } },
        limit: 1,
        depth: 0,
        select: { username: true },
      })
      const user = found.docs[0]
      if (!user) throw new Error(t('No user with username “{{username}}”', { username }))
      const museumRole = role as MuseumRole
      // One row per (user, museum): an existing member gets the new role.
      const existing = members.find((member) => member.userId === user.id)
      return existing
        ? payloadSdk.update({
            collection: 'user-museum-memberships',
            id: existing.membershipId,
            data: { role: museumRole },
          })
        : payloadSdk.create({
            collection: 'user-museum-memberships',
            data: { user: user.id, museum: museumId, role: museumRole },
          })
    },
    () => invite.reset(),
  )

  return (
    <Stack gap="md">
      <Title order={2}>{t('Museum staff')}</Title>
      {members.map((member) => {
        // Only rows strictly below the visitor's rank are manageable.
        const manageable = member.userId !== viewerId && grantable.includes(member.role)
        return (
          <Paper key={member.membershipId} withBorder p="sm" radius="md">
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={0} miw={0}>
                <Text fw={500} truncate>
                  {member.name}
                </Text>
                <Text size="xs" c="dimmed">
                  @{member.username}
                </Text>
              </Stack>
              {manageable ? (
                <Group gap="xs" wrap="nowrap">
                  <Select
                    aria-label={t('Role of {{name}}', { name: member.name })}
                    data={roleOptions}
                    value={member.role}
                    allowDeselect={false}
                    onChange={(role) =>
                      role &&
                      changeRole.mutate({ id: member.membershipId, role: role as MuseumRole })
                    }
                    w={180}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('Remove {{name}} from the staff', { name: member.name })}
                    loading={revoke.isPending && revoke.variables === member.membershipId}
                    onClick={() => revoke.mutate(member.membershipId)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                <Text size="sm">{roleLabel[member.role]}</Text>
              )}
            </Group>
          </Paper>
        )
      })}

      {grantable.length > 0 && (
        <form onSubmit={invite.onSubmit((values) => add.mutate(values))}>
          <Stack gap="xs">
            <Title order={3} size="h4">
              {t('Add someone')}
            </Title>
            <Group align="end" grow>
              <UserPicker
                label={t('Person')}
                value={invite.values.username || null}
                onChange={(username) => invite.setFieldValue('username', username ?? '')}
                error={invite.errors.username as string | undefined}
              />
              <Select
                label={t('Role')}
                data={roleOptions}
                allowDeselect={false}
                {...invite.getInputProps('role')}
              />
            </Group>
            <Group justify="end">
              <Button type="submit" loading={add.isPending}>
                {t('Add')}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Stack>
  )
}
