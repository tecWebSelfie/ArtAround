'use client'

import { normalizeRoomCode, ROOM_CODE_LENGTH, roomPath } from '@/lib/group'
import { Button, Group, PinInput, Stack, Text } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Join a group": the 6-character code a friend or teacher gives out. It only
 * opens the join page (`/room/{code}`), which checks the code and asks for a name.
 */
export function JoinGroupForm() {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const complete = code.length === ROOM_CODE_LENGTH

  return (
    <Stack
      component="form"
      gap={6}
      align="center"
      onSubmit={(event) => {
        event.preventDefault()
        if (complete) router.push(roomPath(lng, code) as Route)
      }}
    >
      <Text size="sm" fw={500}>
        {t('Joining a group? Enter its code')}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <PinInput
          length={ROOM_CODE_LENGTH}
          type="alphanumeric"
          size="sm"
          gap={4}
          value={code}
          onChange={(value) => setCode(normalizeRoomCode(value))}
          ariaLabel={t('Group code')}
          inputMode="text"
          oneTimeCode={false}
        />
        <Button type="submit" size="sm" disabled={!complete}>
          {t('Join')}
        </Button>
      </Group>
    </Stack>
  )
}
