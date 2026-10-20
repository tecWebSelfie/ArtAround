'use client'

import { QRCode } from '@gfazioli/mantine-qr-code'
import { ActionIcon, Center, Modal, Stack, Text, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { QrCode } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * A small button on the tour page that shows the tour's QR code, e.g. for a
 * museum to print it or for a visitor to pass the tour to a companion's phone.
 * The value is the canonical tour URL (`/[lng]/tour/[id]`): the in-app scanner
 * accepts it (QrScanPage), and any camera app simply opens this page.
 */
export function TourQrButton({ tourId, title }: { tourId: string; title: string }) {
  const { t } = useTranslation('tour-page')
  const { lng } = useParams<{ lng: string }>()
  const [opened, modal] = useDisclosure(false)

  return (
    <>
      <Tooltip label={t('Show QR code')}>
        <ActionIcon variant="default" size="lg" aria-label={t('Show QR code')} onClick={modal.open}>
          <QrCode size={18} />
        </ActionIcon>
      </Tooltip>
      <Modal opened={opened} onClose={modal.close} title={t('Scan to open this tour')} centered>
        <Stack align="center" gap="sm">
          <Center>
            {/* Built on open: `window` only exists in the browser. */}
            {opened && (
              <QRCode
                value={`${window.location.origin}/${lng}/tour/${tourId}`}
                size="min(70vw, 280px)"
                errorCorrectionLevel="M"
              />
            )}
          </Center>
          <Text size="sm" c="dimmed" ta="center">
            {title}
          </Text>
        </Stack>
      </Modal>
    </>
  )
}
