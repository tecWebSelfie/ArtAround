// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/mocks/i18n'
import { ShareButton } from '@/components/ShareButton'

/**
 * The page's share action (`ShareButton`, formerly the QR-only dialog): the
 * trigger carries the share mark, the dialog keeps the scannable code and adds
 * the link CTA. The code and the shared link are the same language-free
 * canonical URL, so a companion opens the page and nothing else.
 */

vi.mock('next/navigation', () => ({ useParams: () => ({ lng: 'en' }) }))

// The real component draws the code on a canvas; the dialog's contract is the
// URL it encodes, so a probe keeps the spec focused on sharing.
vi.mock('@gfazioli/mantine-qr-code', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react')
  return {
    QRCode: ({ value }: { value: string }) =>
      createElement('div', { 'data-testid': 'qr-code', 'data-value': value }),
  }
})

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }))

const showNotification = vi.mocked(notifications.show)
const origin = window.location.origin

beforeEach(() => {
  showNotification.mockClear()
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window.navigator, 'share')
  Reflect.deleteProperty(window.navigator, 'clipboard')
})

const openDialog = async (props: Partial<Parameters<typeof ShareButton>[0]> = {}) => {
  const view = render(
    <MantineProvider>
      <ShareButton kind="tour" id="tour-1" title="A tour" {...props} />
    </MantineProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Share' }))
  const dialog = await screen.findByRole('dialog')
  return { view, dialog }
}

const stubShare = (share = vi.fn().mockResolvedValue(undefined)) => {
  Object.defineProperty(window.navigator, 'share', { value: share, configurable: true })
  return share
}

const stubClipboard = (writeText = vi.fn().mockResolvedValue(undefined)) => {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

describe('the page share action', () => {
  it('wears the share mark instead of the QR mark', () => {
    const { container } = render(
      <MantineProvider>
        <ShareButton kind="tour" id="tour-1" title="A tour" />
      </MantineProvider>,
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy()
    expect(container.querySelector('svg.lucide-share-2')).toBeTruthy()
    expect(container.querySelector('svg.lucide-qr-code')).toBeNull()
  })

  it('opens a dialog with the canonical QR code and a link CTA', async () => {
    const { dialog } = await openDialog()
    expect(within(dialog).getByTestId('qr-code').dataset.value).toBe(`${origin}/tour/tour-1`)
    expect(within(dialog).getByText('A tour')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Share link' })).toBeTruthy()
  })

  it('shares the canonical link through the system share sheet', async () => {
    const share = stubShare()
    const { dialog } = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share link' }))
    expect(share).toHaveBeenCalledWith({ title: 'A tour', url: `${origin}/tour/tour-1` })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('copies the link when the browser has no share sheet', async () => {
    const writeText = stubClipboard()
    const { dialog } = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share link' }))
    expect(writeText).toHaveBeenCalledWith(`${origin}/tour/tour-1`)
    await vi.waitFor(() =>
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Link copied' }),
      ),
    )
  })

  it('keeps a dismissed share sheet quiet', async () => {
    const share = stubShare(vi.fn().mockRejectedValue(new DOMException('', 'AbortError')))
    const { dialog } = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share link' }))
    await vi.waitFor(() => expect(share).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('reports a real share failure', async () => {
    stubShare(vi.fn().mockRejectedValue(new DOMException('', 'NotAllowedError')))
    const { dialog } = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share link' }))
    await vi.waitFor(() =>
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'red',
          message: 'The link could not be shared. Copy it from the address bar.',
        }),
      ),
    )
  })

  it('keeps the printable downloads for the museum staff', async () => {
    const { dialog } = await openDialog({ printMuseumId: 'museum-1' })
    for (const [name, format] of [
      ['Download printable PDF', 'pdf'],
      ['Download as SVG', 'svg'],
      ['Download as PNG', 'png'],
    ] as const) {
      const link = within(dialog).getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(
        `/api/qr-sheet?kind=tour&id=tour-1&lng=en&format=${format}`,
      )
    }
  })
})
