'use client'

import { roomPath } from '@/lib/group'
import { Button, Checkbox, Modal, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { UsersRound } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJoinGroup } from './GroupProvider'
import { GroupNameForm } from './GroupNameForm'

/**
 * "Start with a group": asks the host's name (shown to the group), opens a
 * room for this tour (`/api/rooms`) and goes to its waiting room. This device
 * becomes the host and keeps the host key the server returned.
 *
 * Seeing everyone's quiz score is the host's choice, off by default (friends
 * may not want it; a teacher will): guests are told on the join page.
 */
export function StartGroupButton({ tourId }: { tourId: string }) {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const join = useJoinGroup()
  const [opened, modal] = useDisclosure(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const openGroup = async (name: string) => {
    setBusy(true)
    setFailed(false)
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, name, showResults }),
      })
      if (!response.ok) throw new Error(String(response.status))
      const { code, hostKey } = (await response.json()) as { code: string; hostKey: string }
      join({ code, tourId, name, role: 'host', hostKey })
      router.push(roomPath(lng, code) as Route)
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="default" leftSection={<UsersRound size={16} />} onClick={modal.open}>
        {t('Start with a group')}
      </Button>
      <Modal opened={opened} onClose={modal.close} title={t('Start with a group')} centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('You lead the group: everyone follows your steps and waits for you to move on.')}
          </Text>
          <GroupNameForm
            submitLabel={t('Open the group')}
            busy={busy}
            onSubmit={(name) => void openGroup(name)}
            error={failed ? t('The group could not be opened. Try again in a minute.') : null}
          >
            <Checkbox
              label={t('See everyone’s quiz results')}
              description={t('Each person is told before joining.')}
              checked={showResults}
              onChange={(event) => setShowResults(event.currentTarget.checked)}
            />
          </GroupNameForm>
        </Stack>
      </Modal>
    </>
  )
}
