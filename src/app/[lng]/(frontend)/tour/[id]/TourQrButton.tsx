'use client'

import { QRCode } from '@gfazioli/mantine-qr-code'
import { ActionIcon, Center, Modal, rem, Stack, Text, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { QrCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * A small button on the tour page that shows the tour's QR code, e.g. for a
 * museum to print it or for a visitor to pass the tour to a companion's phone.
 * The value is the language-free tour URL (`/tour/[id]`), safe to print: a
 * camera app opens it in the visitor's language through the i18n proxy, the
 * in-app scanner in the app's language (`inLanguage`, QrScanPage).
 */
export function TourQrButton({ tourId, title }: { tourId: string; title: string }) {
  const { t } = useTranslation('tour-page')
  const [opened, modal] = useDisclosure(false)

  return (
    <>
      <Tooltip label={t('Show QR code')}>
        <ActionIcon variant="default" size="lg" aria-label={t('Show QR code')} onClick={modal.open}>
          <QrCode size={18} />
        </ActionIcon>
      </Tooltip>
      {/* Title centred on the header: it grows to fill it, and an inline
          start padding as wide as the default close button (md, 28px) balances the X on the right. */}
      <Modal
        opened={opened}
        onClose={modal.close}
        title={t('Scan to open this tour')}
        centered
        styles={{
          title: { flex: 1, textAlign: 'center', paddingInlineStart: rem(28) },
        }}
      >
        <Stack align="center" gap="sm">
          <Center>
            {/* Built on open: `window` only exists in the browser. */}
            {opened && (
              <QRCode
                value={`${window.location.origin}/tour/${tourId}`}
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
