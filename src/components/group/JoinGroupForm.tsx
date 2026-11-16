'use client'

import {
  normalizeRoomCode,
  ROOM_CODE_MAX_LENGTH,
  ROOM_CODE_MIN_LENGTH,
  ROOM_CODE_PATTERN,
  roomPath,
} from '@/lib/group'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { UsersRound } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Join a group": the name the teacher chose for it ("Fenice rossa") or the
 * 6-character code a friend gives out, in one field: both are room codes once
 * normalized (`normalizeRoomCode`). It only opens the join page
 * (`/room/{code}`), which checks the code and asks for a name. Shown on the
 * navigator home (the secondary way in, under the start blocks), the tour
 * start page and the room page.
 *
 * Open, with no container: the question is the field's real label, the group
 * icon sits at the field's left edge (it says what goes in it), and the text
 * is set like a code (capitals, wide tracking, tabular figures; the example
 * placeholder stays as written). The hint hangs just under the field, small,
 * so it reads as the field's note.
 *
 * Join stays disabled (Mantine's gray, not clickable) until the text fits the
 * room-code pattern: next to the navigator's light "Plan a visit" block a
 * light Join read as an available action. The gray button is never left
 * unexplained: the hint under the field says where the code comes from, and
 * once something is typed that doesn't fit, it states the length rule instead.
 */
export function JoinGroupForm() {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const room = normalizeRoomCode(code)
  const complete = ROOM_CODE_PATTERN.test(room)
  const inputId = useId()
  // The limits come from the same constants the pattern checks.
  const hint =
    code.trim() && !complete
      ? t('Whoever leads the group shares it: {{min}} to {{max}} letters or numbers.', {
          min: ROOM_CODE_MIN_LENGTH,
          max: ROOM_CODE_MAX_LENGTH,
        })
      : t('Whoever leads the group gives it to you.')

  return (
    <Stack
      component="form"
      gap={6}
      // Full width of its slot: each page sets the measure (the navigator
      // lines it up with the start blocks, the other pages cap it).
      w="100%"
      onSubmit={(event) => {
        event.preventDefault()
        if (complete) router.push(roomPath(lng, room) as Route)
      }}
    >
      <Text component="label" htmlFor={inputId} fw={700} lh={1.25}>
        {t('Joining a group?')}
      </Text>
      {/* The field takes the row's free width (a name is longer than a code).
          The hint is the field's Mantine description, placed under the input
          so Mantine wires it to the input's aria-describedby. */}
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <TextInput
          id={inputId}
          flex={1}
          size="md"
          radius="md"
          inputWrapperOrder={['input', 'description']}
          leftSection={<UsersRound size={20} aria-hidden />}
          classNames={{
            input:
              'font-semibold tracking-[0.08em] uppercase tabular-nums placeholder:font-normal placeholder:tracking-normal placeholder:normal-case',
            section: 'text-(--mantine-primary-color-filled)',
            description: 'mt-1 text-(length:--mantine-font-size-xs)',
          }}
          value={code}
          onChange={(event) => setCode(event.currentTarget.value)}
          description={hint}
          placeholder={t('Red Phoenix or AB3X9K')}
          maxLength={40}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" size="md" radius="md" disabled={!complete}>
          {t('Join')}
        </Button>
      </Group>
    </Stack>
  )
}
