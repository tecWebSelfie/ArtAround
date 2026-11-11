'use client'

import { normalizeRoomCode, ROOM_CODE_PATTERN, roomPath } from '@/lib/group'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Join a group": the name the teacher chose for it ("Fenice rossa") or the
 * 6-character code a friend gives out, in one field: both are room codes once
 * normalized (`normalizeRoomCode`). It only opens the join page
 * (`/room/{code}`), which checks the code and asks for a name.
 */
export function JoinGroupForm() {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const room = normalizeRoomCode(code)
  const complete = ROOM_CODE_PATTERN.test(room)

  return (
    <Stack
      component="form"
      gap={6}
      align="center"
      onSubmit={(event) => {
        event.preventDefault()
        if (complete) router.push(roomPath(lng, room) as Route)
      }}
    >
      <Text size="sm" fw={500}>
        {t('Joining a group? Enter its name or code')}
      </Text>
      {/* The field takes the row's free width (a name is longer than a code). */}
      <Group gap="xs" wrap="nowrap" w="100%" maw="24rem">
        <TextInput
          flex={1}
          size="sm"
          value={code}
          onChange={(event) => setCode(event.currentTarget.value)}
          aria-label={t('Group code')}
          placeholder={t('Group name or code')}
          maxLength={40}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm" disabled={!complete}>
          {t('Join')}
        </Button>
      </Group>
    </Stack>
  )
}
