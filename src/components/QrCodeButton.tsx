'use client'

import { QRCode } from '@gfazioli/mantine-qr-code'
import { ActionIcon, Button, Center, Group, Modal, rem, Stack, Text, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Download, FileText, QrCode } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { QrKind } from '@/lib/qr-museum'

/**
 * The QR code of a tour, object or content page, in a dialog.
 *
 * On screen the code is the plain, language-free URL (`/tour/[id]`…): a
 * visitor passing it to a companion's phone opens the page and nothing else; a
 * camera app reads it in the visitor's language through the i18n proxy, the
 * in-app scanner in the app's language (`inLanguage`, QrScanPage).
 *
 * `printMuseumId` is set only for the staff of the museum that shows the page
 * (`museumAffordances`): they also get the downloads, codes meant to be printed
 * and put up in the museum. `/api/qr-sheet` builds them (PDF page, SVG, PNG):
 * it adds `?museum=<id>`, so whoever scans one on site gets the app already in
 * that museum (`src/proxy.ts`), and checks the visitor is that museum's staff.
 */
export function QrCodeButton({
  kind,
  id,
  title,
  printMuseumId,
  size = 'lg',
}: {
  kind: QrKind
  id: string
  title: string
  printMuseumId?: string | null
  size?: 'xs' | 'lg'
}) {
  const { t } = useTranslation('common')
  const { lng } = useParams<{ lng: string }>()
  const [opened, modal] = useDisclosure(false)
  // The framed PDF page leads; SVG and PNG are the bare code.
  const downloads = [
    { format: 'pdf', label: t('Download printable PDF'), Icon: FileText, variant: 'filled' },
    { format: 'svg', label: t('Download as SVG'), Icon: Download, variant: 'light' },
    { format: 'png', label: t('Download as PNG'), Icon: Download, variant: 'light' },
  ] as const
  const heading = {
    tour: t('Scan to open this tour'),
    object: t('Scan to open this object'),
    content: t('Scan to open this content'),
  }[kind]

  return (
    <>
      <Tooltip label={t('Show QR code')}>
        <ActionIcon
          variant="default"
          size={size}
          aria-label={t('Show QR code')}
          onClick={modal.open}
        >
          <QrCode size={size === 'lg' ? 18 : 14} aria-hidden />
        </ActionIcon>
      </Tooltip>
      {/* Title centred on the header: it grows to fill it, and an inline
          start padding as wide as the default close button (md, 28px)
          balances the X on the right. */}
      <Modal
        opened={opened}
        onClose={modal.close}
        title={heading}
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
                value={`${window.location.origin}/${kind}/${id}`}
                size="min(70vw, 280px)"
                errorCorrectionLevel="M"
              />
            )}
          </Center>
          <Text size="sm" c="dimmed" ta="center">
            {title}
          </Text>
          {printMuseumId && (
            <>
              <Text size="xs" c="dimmed" ta="center">
                {t('For printing: the downloaded code opens the app in this museum.')}
              </Text>
              {/* Printable codes are built on the server (`/api/qr-sheet`), which
                  adds the museum and checks that the visitor is its staff. */}
              <Group gap="xs" justify="center">
                {downloads.map(({ format, label, Icon, variant }) => (
                  <Button
                    key={format}
                    component="a"
                    href={`/api/qr-sheet?kind=${kind}&id=${id}&lng=${lng}&format=${format}`}
                    download
                    size="compact-sm"
                    variant={variant}
                    leftSection={<Icon size={14} aria-hidden />}
                  >
                    {label}
                  </Button>
                ))}
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </>
  )
}
