import { expect, test } from '@playwright/test'
import { requireLiveKit } from '../../helpers/livekit'
import { requireTourFixture } from '../../helpers/tour-fixture'

/**
 * Nightly QA 2026-11-26, group tours (a): with "See everyone's quiz results"
 * on, a guest publishes its `quizToken` as a LiveKit participant attribute so
 * the host's board can read the score. Attributes are delivered to EVERY
 * participant, so every other guest receives it too, and the token is the
 * whole credential of that guest's result page
 * (`/{lng}/tour/{id}/quiz/result/{token}`: answers, explanations, score,
 * readable by anyone holding it, no sign-in). The same goes for the guest's
 * `requests` attribute ("who asked what"). Beyond that, a guest can republish
 * somebody else's token as its own and show that score on the host's board.
 *
 * docs/group-tours.md promises that the HOST sees each score with a link to
 * the answers, and the join page says "<host> will see your score"; it says
 * nothing of the other guests (classmates) seeing it.
 *
 * Expected secure behavior: a guest's quiz token reaches the host only.
 */
test.setTimeout(180_000)

const UMD = 'node_modules/livekit-client/dist/livekit-client.umd.js'

test('a guest does not receive the quiz token of another guest', async ({ browser, request }) => {
  await requireLiveKit()
  const fixture = requireTourFixture()
  const origin = new URL(fixture.url).origin
  const ip = { 'x-forwarded-for': `10.83.${Math.floor(Math.random() * 250)}.${Date.now() % 250}` }
  const created = await request.post(`${origin}/api/rooms`, {
    headers: ip,
    data: { tourId: fixture.tourId, name: 'Teacher', showResults: true },
  })
  expect(created.status()).toBe(200)
  const { code, hostKey } = (await created.json()) as { code: string; hostKey: string }

  const contexts = [] as Awaited<ReturnType<typeof browser.newContext>>[]
  // A bare LiveKit client in a page of the app origin (same-origin token route).
  const client = async (key: string | null, guestId: string, name: string) => {
    const context = await browser.newContext({ extraHTTPHeaders: ip })
    contexts.push(context)
    const page = await context.newPage()
    await page.goto(`${origin}/api/rooms/${code}`)
    await page.addScriptTag({ path: UMD })
    await page.evaluate(
      async ([roomCode, host, id, displayName]) => {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'X-Guest-Id': id as string,
        }
        if (host) headers['X-Host-Key'] = host
        const response = await fetch('/api/rooms/token', {
          method: 'POST',
          headers,
          body: JSON.stringify({ room_name: roomCode, participant_name: displayName }),
        })
        const { server_url, participant_token } = await response.json()
        // oxlint-disable-next-line typescript/no-explicit-any -- UMD global of the injected script
        const room = new (window as any).LivekitClient.Room()
        await room.connect(server_url, participant_token)
        // oxlint-disable-next-line typescript/no-explicit-any
        ;(window as any).room = room
      },
      [code, key, guestId, name] as const,
    )
    return page
  }
  try {
    const host = await client(hostKey, 'qa-host-0001', 'Teacher')
    const alice = await client(null, 'qa-alice-0001', 'Alice')
    const mallory = await client(null, 'qa-mallory-001', 'Mallory')

    await alice.evaluate(
      // oxlint-disable-next-line typescript/no-explicit-any
      () =>
        (window as any).room.localParticipant.setAttributes({ quizToken: 'ALICE-RESULT-TOKEN' }),
    )
    const seenBy = (page: typeof host) =>
      page.evaluate(() =>
        // oxlint-disable-next-line typescript/no-explicit-any
        [...(window as any).room.remoteParticipants.values()].flatMap(
          // oxlint-disable-next-line typescript/no-explicit-any
          (participant: any) => participant.attributes.quizToken ?? [],
        ),
      )
    // Control: the host receives it (the board needs it).
    await expect.poll(() => seenBy(host)).toContain('ALICE-RESULT-TOKEN')
    // Another guest must not.
    await mallory.waitForTimeout(2_000)
    expect(await seenBy(mallory)).not.toContain('ALICE-RESULT-TOKEN')
  } finally {
    await request.delete(`${origin}/api/rooms/${code}`, {
      headers: { ...ip, 'X-Host-Key': hostKey },
    })
    await Promise.all(contexts.map((context) => context.close()))
  }
})
