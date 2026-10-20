'use client'

import { roomPath } from '@/lib/group'
import { QRCode } from '@gfazioli/mantine-qr-code'
import { Button, Center, Group, Modal, Stack, Text } from '@mantine/core'
import { useClipboard, useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { QrCode, Share2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * The host's two ways to let people in: share the join link (the system
 * share sheet, or a copy when there is none) or show a QR code to scan.
 * Both open `/[lng]/room/{code}`, the join page.
 */
export function ShareGroup({ code }: { code: string }) {
  const { t } = useTranslation('group')
  const { lng } = useParams<{ lng: string }>()
  const clipboard = useClipboard()
  const [qrOpened, qr] = useDisclosure(false)
  const link = () => `${window.location.origin}${roomPath(lng, code)}`

  const share = async () => {
    const url = link()
    if (navigator.share) {
      // Closing the share sheet rejects; that is not an error for the visitor.
      await navigator.share({ title: t('Join my group tour'), url }).catch(() => {})
      return
    }
    clipboard.copy(url)
    notifications.show({ title: t('Link copied'), message: url })
  }

  return (
    <>
      <Group grow>
        <Button variant="default" leftSection={<Share2 size={16} />} onClick={share}>
          {t('Share link')}
        </Button>
        <Button variant="default" leftSection={<QrCode size={16} />} onClick={qr.open}>
          {t('Show QR code')}
        </Button>
      </Group>
      <Modal opened={qrOpened} onClose={qr.close} title={t('Scan to join')} centered>
        <Stack align="center" gap="sm">
          <Center>
            {qrOpened && <QRCode value={link()} size="min(70vw, 280px)" errorCorrectionLevel="M" />}
          </Center>
          <Text size="sm" c="dimmed" ta="center">
            {t('Or enter the code {{code}}', { code })}
          </Text>
        </Stack>
      </Modal>
    </>
  )
}
