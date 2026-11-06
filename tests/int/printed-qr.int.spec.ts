import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Basic localization by QR code (course brief, Navigator 18-33: "next to every
 * work there is a QR code; the visitor scans it and the Navigator finds the
 * descriptions of that object"; project requirements: printed QR codes that
 * simulate standing next to an object).
 *
 * The seam is the URL a printed code carries (`printedCodeUrl`, the only
 * place `/api/qr-sheet` builds it) as the app receives it from the phone's
 * camera (`src/proxy.ts`): it must land on that object's page, in the
 * visitor's language, with the app locked to the museum the code hangs in.
 * Decoding the image is the scanner's job and is covered by
 * `tests/e2e/tour-qr.e2e.spec.ts`.
 */
vi.mock('server-only', () => ({}))
const { printedCodeUrl } = await import('@/lib/qr-museum')
const { proxy } = await import('@/proxy')
const { parseAppUrl } = await import('@/lib/app-url')
const { MUSEUM_MODE_COOKIE } = await import('@/lib/museum-cookie')

const ORIGIN = 'https://artaround.example'
const MUSEUM = 'a1b2c3d4e5f6a1b2c3d4e5f6'
const OBJECT = '0123456789abcdef01234567'

/** What a phone sends when its camera opens the printed code. */
const scan = (url: string, language = 'it-IT,it;q=0.9') =>
  proxy(new NextRequest(url, { headers: { 'accept-language': language } }))

describe('a printed QR code next to a work', () => {
  it('carries the object, not a language, and the museum it hangs in', () => {
    expect(printedCodeUrl(ORIGIN, `object/${OBJECT}`, MUSEUM)).toBe(
      `${ORIGIN}/object/${OBJECT}?museum=${MUSEUM}`,
    )
  })

  it('opens that object in the visitor’s language, in one redirect', async () => {
    const response = scan(printedCodeUrl(ORIGIN, `object/${OBJECT}`, MUSEUM))

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe(`/it/object/${OBJECT}`)
    expect(location.search).toBe('')
    // The landing page is one the in-app scanner accepts too.
    expect(parseAppUrl(location.href, ORIGIN)?.pathname).toBe(`/it/object/${OBJECT}`)
  })

  it('locks the app to the museum the code hangs in', () => {
    const response = scan(printedCodeUrl(ORIGIN, `object/${OBJECT}`, MUSEUM), 'fr')

    expect(new URL(response.headers.get('location')!).pathname).toBe(`/fr/object/${OBJECT}`)
    expect(response.cookies.get(MUSEUM_MODE_COOKIE)?.value).toBe(MUSEUM)
  })

  it('never locks the app to a malformed museum id', () => {
    const response = scan(`${ORIGIN}/object/${OBJECT}?museum=not-an-id`)

    expect(response.cookies.get(MUSEUM_MODE_COOKIE)).toBeUndefined()
  })
})
