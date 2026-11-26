import { expect, test } from '@playwright/test'
import { requireLiveKit } from '../../helpers/livekit'
import { requireTourFixture } from '../../helpers/tour-fixture'

/**
 * Nightly QA 2026-11-26, group tours (b): a guest follows the host's `path`
 * attribute WITHOUT checking it belongs to the group's tour.
 *
 * `GroupSync` (src/components/group/GroupConnection.tsx) calls
 * `router.replace(followHref(host.path, ...))` for any `path` the participant
 * `host` publishes. The host side only publishes locations that pass
 * `isTourLocation`, but the guest side never re-checks, and anyone can open a
 * room for a public tour and be its host (a modified client sets the attribute
 * directly). The `/{lng}` prefix keeps the guest on this origin, but the host
 * can still pull every guest off the tour onto any page of the site and, with
 * `/tour/<id>?museum=<id>` (the printed-QR shape handled by src/proxy.ts),
 * make the proxy plant the `aa-museum` (museum mode) cookie on the guest's
 * device: a state change of the guest's browser caused by someone else.
 *
 * Expected secure behavior: a guest only follows locations of the group's
 * own tour (`isTourLocation`), so a hostile `path` changes nothing.
 */
test.setTimeout(180_000)

const UMD = 'node_modules/livekit-client/dist/livekit-client.umd.js'

test('a guest ignores a host path that is not a location of the group tour', async ({
  browser,
  request,
}) => {
  await requireLiveKit()
  const fixture = requireTourFixture()
  const origin = new URL(fixture.url).origin
  // A distinct forwarded IP keeps the room routes' rate limit out of the way.
  const ip = { 'x-forwarded-for': `10.79.${Math.floor(Math.random() * 250)}.${Date.now() % 250}` }

  const created = await request.post(`${origin}/api/rooms`, {
    headers: ip,
    data: { tourId: fixture.tourId, name: 'Host' },
  })
  expect(created.status()).toBe(200)
  const { code, hostKey } = (await created.json()) as { code: string; hostKey: string }

  // The "host" is a bare LiveKit client that can publish any `path`.
  const hostContext = await browser.newContext({ extraHTTPHeaders: ip })
  const host = await hostContext.newPage()
  await host.goto(`${origin}/api/rooms/${code}`)
  await host.addScriptTag({ path: UMD })
  await host.evaluate(
    async ([roomCode, key]) => {
      const response = await fetch('/api/rooms/token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Host-Key': key,
          'X-Guest-Id': 'qa-host-0001',
        },
        body: JSON.stringify({ room_name: roomCode, participant_name: 'Host' }),
      })
      const { server_url, participant_token } = await response.json()
      // oxlint-disable-next-line typescript/no-explicit-any -- UMD global of the injected script
      const room = new (window as any).LivekitClient.Room()
      await room.connect(server_url, participant_token)
      // oxlint-disable-next-line typescript/no-explicit-any
      ;(window as any).hostRoom = room
    },
    [code, hostKey],
  )
  const publish = (path: string) =>
    host.evaluate(
      // oxlint-disable-next-line typescript/no-explicit-any
      (value) => (window as any).hostRoom.localParticipant.setAttributes({ path: value }),
      path,
    )

  // A real guest browser joins through the page, as a visitor would.
  const guestContext = await browser.newContext({ extraHTTPHeaders: ip })
  const guest = await guestContext.newPage()
  try {
    await guest.goto(`${origin}/en/room/${code}`, { waitUntil: 'domcontentloaded' })
    await guest.getByRole('textbox', { name: 'Your name' }).fill('Guest')
    await guest.getByRole('button', { name: 'Join the group' }).click()
    await expect(guest.getByText('Waiting for Host')).toBeVisible({ timeout: 60_000 })

    // Control: a location of the group's own tour is followed.
    const own = `/museum/${fixture.museumId}/navigation/tour/${fixture.tourId}`
    await publish(own)
    await expect(guest).toHaveURL(new RegExp(`/en${own}$`), { timeout: 60_000 })

    // Hostile: a page of the same site that is not the tour, shaped as the
    // printed-QR link that sets museum mode.
    await publish(`/tour/${fixture.tourId}?museum=${fixture.museumId}`)
    await guest.waitForTimeout(5_000)
    const cookies = await guestContext.cookies()
    expect(guest.url()).not.toContain(`/en/tour/${fixture.tourId}`)
    expect(cookies.map(({ name }) => name)).not.toContain('aa-museum')

    // Hostile: another section of the site altogether.
    await publish('/marketplace')
    await guest.waitForTimeout(5_000)
    expect(new URL(guest.url()).pathname).not.toBe('/en/marketplace')
  } finally {
    await request.delete(`${origin}/api/rooms/${code}`, {
      headers: { ...ip, 'X-Host-Key': hostKey },
    })
    await hostContext.close()
    await guestContext.close()
  }
})
