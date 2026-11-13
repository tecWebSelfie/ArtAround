'use client'

import { GroupRoomName, roomPath } from '@/lib/group'
import { Button, ButtonProps, Checkbox, Modal, Stack, Text, TextInput } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { UsersRound } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJoinGroup } from './GroupProvider'
import { GroupNameForm } from './GroupNameForm'

/**
 * "Start with a group": asks the host's name (shown to the group), opens a
 * room for this tour (`/api/rooms`) and goes to its waiting room. This device
 * becomes the host and keeps the host key the server returned.
 *
 * The host can name the group ("Fenice rossa"): the others then join by typing
 * that name instead of a random code. A name in use by another open group is
 * refused by the server (409) and the host picks another.
 *
 * Seeing everyone's quiz score is the host's choice, off by default (friends
 * may not want it; a teacher will): guests are told on the join page.
 */
export function StartGroupButton({
  tourId,
  navigationQuery = '',
  label,
  classNames,
}: {
  tourId: string
  navigationQuery?: string
  /** Overrides the button's own label (not the modal's); the default names
   * the action alone, and a tighter layout can ask for the "you lead it"
   * reading the modal already gives, spelled out up front instead. */
  label?: ReactNode
  /** Forwarded to the button's own Styles API (`inner`/`section`/`label`),
   * so a caller that reshapes its layout (icon-over-label, a line clamp)
   * can do it through Mantine's supported part names instead of reaching
   * into `.mantine-Button-*` from outside. */
  classNames?: ButtonProps['classNames']
}) {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const join = useJoinGroup()
  const [opened, modal] = useDisclosure(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<false | 'unavailable' | 'taken'>(false)
  const [showResults, setShowResults] = useState(false)
  const [groupName, setGroupName] = useState('')
  const groupNameValid = GroupRoomName.safeParse(groupName).success

  const openGroup = async (name: string) => {
    setBusy(true)
    setFailed(false)
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, name, showResults, groupName: groupName.trim() }),
      })
      // 409: another open group has this name. Anything else: not available.
      if (!response.ok) throw new Error(response.status === 409 ? 'taken' : 'unavailable')
      const { code, hostKey } = (await response.json()) as { code: string; hostKey: string }
      join({ code, tourId, name, role: 'host', hostKey })
      // The invite remains language/profile-free; these choices belong only to the host.
      router.push(`${roomPath(lng, code)}${navigationQuery ? `?${navigationQuery}` : ''}` as Route)
    } catch (error) {
      setFailed(error instanceof Error && error.message === 'taken' ? 'taken' : 'unavailable')
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="default"
        leftSection={<UsersRound size={16} />}
        onClick={modal.open}
        classNames={classNames}
      >
        {label ?? t('Start with a group')}
      </Button>
      <Modal
        opened={opened}
        onClose={modal.close}
        title={t('Start with a group')}
        closeButtonProps={{ 'aria-label': t('Close', { ns: 'common' }) }}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('You lead the group: everyone follows your steps and waits for you to move on.')}
          </Text>
          <GroupNameForm
            submitLabel={t('Open the group')}
            busy={busy}
            onSubmit={(name) => {
              if (groupNameValid) void openGroup(name)
            }}
            error={
              failed === 'taken'
                ? t('Another group is using this name. Choose a different one.')
                : failed
                  ? t('The group could not be opened. Try again in a minute.')
                  : null
            }
          >
            <TextInput
              label={t('Group name (optional)')}
              description={t(
                'An easy name such as "Red phoenix": the others join by typing it. Leave it empty to get a code.',
              )}
              maxLength={30}
              value={groupName}
              onChange={(event) => {
                setGroupName(event.currentTarget.value)
                setFailed(false)
              }}
              error={groupNameValid ? undefined : t('Use at least 3 letters or numbers')}
            />
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
