'use client'

import {
  normalizeRoomCode,
  ROOM_CODE_MAX_LENGTH,
  ROOM_CODE_MIN_LENGTH,
  ROOM_CODE_PATTERN,
  roomPath,
} from '@/lib/group'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Join a group": the name the teacher chose for it ("Fenice rossa") or the
 * 6-character code a friend gives out, in one field: both are room codes once
 * normalized (`normalizeRoomCode`). It only opens the join page
 * (`/room/{code}`), which checks the code and asks for a name.
 *
 * The visible question is the field's real label (so its accessible name is
 * what sighted visitors read), the placeholder is only an example, and a hint
 * under the field says who gives the code and what it looks like: it is also
 * why Join stays disabled until the text fits.
 */
export function JoinGroupForm() {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const room = normalizeRoomCode(code)
  const complete = ROOM_CODE_PATTERN.test(room)
  const inputId = useId()
  const hintId = useId()

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
      <Text component="label" htmlFor={inputId} size="sm" fw={500} ta="center">
        {t('Joining a group? Enter its name or code')}
      </Text>
      {/* The field takes the row's free width (a name is longer than a code). */}
      <Group gap="xs" wrap="nowrap" w="100%" maw="24rem">
        <TextInput
          id={inputId}
          flex={1}
          size="sm"
          value={code}
          onChange={(event) => setCode(event.currentTarget.value)}
          aria-describedby={hintId}
          placeholder={t('Red Phoenix or AB3X9K')}
          maxLength={40}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm" disabled={!complete}>
          {t('Join')}
        </Button>
      </Group>
      <Text id={hintId} size="xs" c="dimmed" ta="center" maw="24rem">
        {/* The limits come from the same constants the pattern checks. */}
        {t('Whoever leads the group shares it: {{min}} to {{max}} letters or numbers.', {
          min: ROOM_CODE_MIN_LENGTH,
          max: ROOM_CODE_MAX_LENGTH,
        })}
      </Text>
    </Stack>
  )
}
