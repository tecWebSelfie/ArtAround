'use client'

import { useGroupSettings, useIsGroupGuest } from '@/components/group/GroupProvider'
import { useGroupExit } from '@/components/group/use-group-exit'
import { Button, Divider, Group, Modal, Text } from '@mantine/core'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { withNavigationPosition } from '@/lib/tour-navigation'
import { useNavigationScope } from '../TourNavigationShell'
import { useTranslation } from 'react-i18next'

/**
 * Shared modal shell so closing a detail returns to the current map URL and
 * state: the tour step, or free navigation of the museum.
 *
 * In a group, a guest's modal is the host's: it opened when the host opened
 * it and closes when the host closes it (GroupProvider follows the host's
 * URL), so the guest gets no close button, Escape or outside click. Reading
 * stays free (Tell me more, reading options); "Leave the group" is the way out.
 */
export function NavigationModal({ children }: { children: ReactNode }) {
  const router = useRouter()
  const navigation = useNavigationScope()
  const search = useSearchParams()
  const { t } = useTranslation('tour-navigation')
  const guest = useIsGroupGuest()

  return (
    <Modal
      opened
      title={t('Museum content')}
      closeButtonProps={{ 'aria-label': t('Close') }}
      withCloseButton={!guest}
      closeOnEscape={!guest}
      closeOnClickOutside={!guest}
      onClose={() => {
        if (guest || !navigation) return
        router.replace(withNavigationPosition(navigation.base, search.toString()))
      }}
    >
      {children}
      {guest && <GuestModalFooter />}
    </Modal>
  )
}

function GuestModalFooter() {
  const { t } = useTranslation('group')
  const { hostName } = useGroupSettings()
  const { confirmLeave } = useGroupExit()
  return (
    <>
      <Divider my="md" />
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" c="dimmed" role="status">
          {t('{{name}} will continue when ready', { name: hostName })}
        </Text>
        <Button variant="subtle" color="gray" size="compact-sm" onClick={confirmLeave}>
          {t('Leave the group')}
        </Button>
      </Group>
    </>
  )
}
