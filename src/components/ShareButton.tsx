'use client'

import { QRCode } from '@gfazioli/mantine-qr-code'
import { ActionIcon, Button, Center, Group, Modal, rem, Stack, Text, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Download, FileText, Share2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { QrKind } from '@/lib/qr-museum'

/**
 * The share action of a tour, object or content page: the link CTA and the
 * scannable code, in one dialog.
 *
 * The shared link and the on-screen code are the same plain, language-free URL
 * (`/tour/[id]`…): a visitor passing it to a companion's phone opens the page
 * and nothing else; a camera app reads it in the visitor's language through
 * the i18n proxy, the in-app scanner in the app's language (`inLanguage`,
 * QrScanPage). The system share sheet is used when the browser has one, the
 * clipboard otherwise.
 *
 * `printMuseumId` is set only for the staff of the museum that shows the page
 * (`museumAffordances`): they also get the downloads, codes meant to be printed
 * and put up in the museum. `/api/qr-sheet` builds them (PDF page, SVG, PNG):
 * it adds `?museum=<id>`, so whoever scans one on site gets the app already in
 * that museum (`src/proxy.ts`), and checks the visitor is that museum's staff.
 */
export function ShareButton({
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
  const scanHeading = {
    tour: t('Scan to open this tour'),
    object: t('Scan to open this object'),
    content: t('Scan to open this content'),
  }[kind]
  const link = () => `${window.location.origin}/${kind}/${id}`

  const share = async () => {
    const url = link()
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      notifications.show({ message: t('Link copied') })
    } catch (error) {
      // Closing the system share sheet rejects; that is not an error for the visitor.
      if (error instanceof DOMException && error.name === 'AbortError') return
      notifications.show({
        color: 'red',
        message: t('The link could not be shared. Copy it from the address bar.'),
      })
    }
  }

  return (
    <>
      <Tooltip label={t('Share')}>
        <ActionIcon variant="default" size={size} aria-label={t('Share')} onClick={modal.open}>
          <Share2 size={size === 'lg' ? 18 : 14} aria-hidden />
        </ActionIcon>
      </Tooltip>
      {/* Title centred on the header: it grows to fill it, and an inline
          start padding as wide as the default close button (md, 28px)
          balances the X on the right. */}
      <Modal
        opened={opened}
        onClose={modal.close}
        title={t('Share')}
        centered
        styles={{
          title: { flex: 1, textAlign: 'center', paddingInlineStart: rem(28) },
        }}
      >
        <Stack align="center" gap="sm">
          <Text size="sm" fw={500} ta="center">
            {scanHeading}
          </Text>
          <Center>
            {/* Built on open: `window` only exists in the browser. */}
            {opened && <QRCode value={link()} size="min(70vw, 280px)" errorCorrectionLevel="M" />}
          </Center>
          <Text size="sm" c="dimmed" ta="center">
            {title}
          </Text>
          <Button fullWidth leftSection={<Share2 size={16} aria-hidden />} onClick={share}>
            {t('Share link')}
          </Button>
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
