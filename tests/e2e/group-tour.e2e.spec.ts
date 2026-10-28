import { expect as baseExpect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Group tours with two real browsers, a host and a guest, on the real Next
 * app and a LiveKit server (`docker compose -f my-agent/compose.livekit.yaml
 * up -d livekit` locally):
 *
 *   host opens a group → guest joins with the code → host starts →
 *   guest follows → host opens a stop, guest can't close it → host closes →
 *   host leads into the quiz → guest answers → host ends it and sees the score.
 *
 * Needs `pnpm exec tsx scripts/seed-tour-navigation.ts` (it adds a 2-question
 * quiz) and a dev server. Set `E2E_SCREENSHOTS=<dir>` to keep screenshots.
 */
const expect = baseExpect.configure({ timeout: 60_000 })
const fixturePath = resolve('.e2e-fixtures/tour-navigation-fixture.json')
const fixture = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      url: string
      tourId: string
      museumId: string
    })
  : null
const shots = process.env.E2E_SCREENSHOTS
const at = (path: string) => `${new URL(fixture!.url).origin}${path}`
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true })
}

test.beforeEach(() => {
  test.skip(!fixture?.tourId, 'Run scripts/seed-tour-navigation.ts first.')
  test.setTimeout(400_000)
})

test('a guest follows the host through the tour and the quiz', async ({ browser }) => {
  const host = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // Host: "Start with a group" on the tour's start page.
  await host.goto(at(`/en/museum/${fixture!.museumId}/navigation/tour/${fixture!.tourId}`), {
    waitUntil: 'domcontentloaded',
  })
  // A click before hydration does nothing: click until the name field appears.
  const hostName = host.getByRole('textbox', { name: 'Your name' })
  await expect(async () => {
    await host.getByRole('button', { name: 'Start with a group' }).click()
    await expect(hostName).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await hostName.fill('Anna')
  // The host chooses to see everyone's score (off by default).
  await host.getByRole('checkbox', { name: 'See everyone’s quiz results' }).check()
  await host.getByRole('button', { name: 'Open the group' }).click()
  await expect(host).toHaveURL(/\/en\/room\/[A-Z2-9]{6}$/)
  const code = host.url().split('/').pop()!

  // Guest: joins with the code from the navigator home.
  await guest.goto(at('/en/navigator'), { waitUntil: 'domcontentloaded' })
  // Typing before hydration is lost, so type until the code is accepted.
  const join = guest.getByRole('button', { name: 'Join', exact: true })
  await expect(async () => {
    await guest.getByRole('textbox', { name: 'Group code' }).first().click()
    await guest.keyboard.type(code.toLowerCase())
    await expect(join).toBeEnabled({ timeout: 1_000 })
  }).toPass()
  await join.click()
  await expect(guest).toHaveURL(new RegExp(`/en/room/${code}$`))
  await expect(
    guest.getByText('Anna will see your score if the tour ends with a quiz.'),
  ).toBeVisible()
  await guest.getByRole('textbox', { name: 'Your name' }).fill('Marco')
  await guest.getByRole('button', { name: 'Join the group' }).click()
  await expect(guest.getByText('Waiting for Anna to start the tour')).toBeVisible()

  // The host sees the guest arrive, live.
  await expect(host.getByText('Marco')).toBeVisible()
  await expect(host.getByText('2 in the group')).toBeVisible()
  await shot(host, 'group-waiting-host')
  await shot(guest, 'group-waiting-guest')

  // Start: the guest is moved into the tour.
  await host.getByRole('button', { name: 'Start the tour' }).click()
  await expect(host).toHaveURL(/\/navigation\/tour\/[^/]+\/0/)
  await expect(guest).toHaveURL(/\/navigation\/tour\/[^/]+\/0/)
  await expect(guest.getByRole('button', { name: 'Your group, 2 people' })).toBeVisible()

  // The host opens the next stop; the guest's modal opens and can't be closed.
  await host.getByRole('button', { name: 'Open next stop' }).click()
  await expect(host.getByRole('dialog')).toBeVisible()
  const guestModal = guest.getByRole('dialog')
  await expect(guestModal).toBeVisible()
  await expect(guestModal.getByText('Anna will continue when ready')).toBeVisible()
  await expect(guestModal.getByRole('button', { name: 'Close' })).toHaveCount(0)
  await guest.keyboard.press('Escape')
  await expect(guestModal).toBeVisible()
  await shot(guest, 'group-modal-guest')

  // Reading stays free: the guest's own "Curiosities" doesn't move the host.
  await guestModal.getByRole('button', { name: 'Curiosities' }).click()
  await expect(guest).toHaveURL(/more=curiosities/)
  await expect(host).not.toHaveURL(/more=/)

  // The host closes it: the guest's modal closes too.
  await host.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(guestModal).toBeHidden()

  // The host leads into the quiz; the guest takes it, the host watches.
  await host.goto(at(`/en/tour/${fixture!.tourId}/quiz?from=2`), {
    waitUntil: 'domcontentloaded',
  })
  await expect(host.getByRole('heading', { name: 'Your group is taking the quiz' })).toBeVisible()
  await expect(guest).toHaveURL(/\/quiz/)
  await guest.getByRole('button', { name: /start/i }).first().click()
  await guest.getByRole('group').getByRole('button').first().click()
  await expect(host.getByText('1 of 2 answered')).toBeVisible()
  await shot(host, 'group-quiz-host')

  // Ending the quiz hands in the guest's answers; the host sees the score.
  await host.getByRole('button', { name: 'End the quiz' }).click()
  await host.getByRole('dialog').getByRole('button', { name: 'End the quiz' }).click()
  await expect(guest).toHaveURL(/\/quiz\/result\//)
  await expect(host.getByRole('heading', { name: 'Quiz results' })).toBeVisible()
  await expect(host.getByText(/^[0-2] of 2$/)).toBeVisible()
  await shot(host, 'group-results-host')

  // Ending the group tour disconnects everyone.
  await host.getByRole('button', { name: 'End the group tour' }).click()
  await host.getByRole('button', { name: 'End for everyone' }).click()
  await expect(guest.getByText('The group tour has ended')).toBeVisible()
})

/** "Start with a group" on the tour's start page; returns the room code. */
async function openGroup(page: Page, name: string, { showResults = false } = {}) {
  await page.goto(at(`/en/museum/${fixture!.museumId}/navigation/tour/${fixture!.tourId}`), {
    waitUntil: 'domcontentloaded',
  })
  const nameField = page.getByRole('textbox', { name: 'Your name' })
  await expect(async () => {
    await page.getByRole('button', { name: 'Start with a group' }).click()
    await expect(nameField).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await nameField.fill(name)
  if (showResults) await page.getByRole('checkbox', { name: 'See everyone’s quiz results' }).check()
  await page.getByRole('button', { name: 'Open the group' }).click()
  await expect(page).toHaveURL(/\/en\/room\/[A-Z2-9]{6}$/)
  return page.url().split('/').pop()!
}

/** Opens the join page and joins; `labels` are the page language's texts. */
async function joinGroup(
  page: Page,
  path: string,
  name: string,
  labels = { name: 'Your name', join: 'Join the group' },
) {
  await page.goto(at(path), { waitUntil: 'domcontentloaded' })
  const nameField = page.getByRole('textbox', { name: labels.name })
  await expect(nameField).toBeVisible()
  await nameField.fill(name)
  await page.getByRole('button', { name: labels.join }).click()
}

/** Answers every question with its first option, then hands the quiz in. */
async function takeQuiz(
  page: Page,
  labels = { start: 'Start the quiz', next: 'Next question', done: 'See your results' },
) {
  await expect(async () => {
    if (!/q=1/.test(page.url())) {
      await page.getByRole('button', { name: labels.start }).click({ timeout: 1_000 })
    }
    await expect(page).toHaveURL(/q=1/, { timeout: 2_000 })
  }).toPass()
  for (let n = 1; ; n++) {
    // One question at a time: answer, wait for its feedback, then move on.
    await expect(page).toHaveURL(new RegExp(`q=${n}`))
    await page.getByRole('group').getByRole('button').first().click()
    await expect(page.getByText(/^(Correct!|Not quite\.|Giusto!|Non proprio\.)/)).toBeVisible()
    const done = page.getByRole('button', { name: labels.done })
    if (await done.isVisible()) {
      await done.click()
      return
    }
    await page.getByRole('button', { name: labels.next }).click()
  }
}

test('private results, a late guest in Italian, and the host reloading', async ({ browser }) => {
  const host = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const code = await openGroup(host, 'Anna')
  await host.getByRole('button', { name: 'Start the tour' }).click()
  await host.getByRole('button', { name: 'Open next stop' }).click()
  await expect(host.getByRole('dialog')).toBeVisible()

  // A late guest, in Italian: no results notice, lands straight in the open modal.
  await guest.goto(at(`/it/room/${code}`), { waitUntil: 'domcontentloaded' })
  await expect(guest.getByText('ti ha invitato')).toBeVisible()
  await expect(guest.getByText('vedrà il tuo punteggio')).toHaveCount(0)
  await joinGroup(guest, `/it/room/${code}`, 'Giulia', {
    name: 'Il tuo nome',
    join: 'Entra nel gruppo',
  })
  await expect(guest).toHaveURL(/\/it\/museum\/[^/]+\/navigation\/tour\/[^/]+\/0\//)
  await expect(guest.getByRole('dialog')).toBeVisible()
  await expect(guest.getByText('Anna proseguirà quando sarà pronto')).toBeVisible()

  // A personal setting (wheelchair route) survives following the host.
  const url = guest.url()
  await guest.goto(`${url}${url.includes('?') ? '&' : '?'}mobility=wheelchair`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(guest.getByRole('dialog')).toBeVisible()
  await host.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(guest.getByRole('dialog')).toBeHidden()
  await expect(guest).toHaveURL(
    /\/it\/museum\/[^/]+\/navigation\/tour\/[^/]+\/0\?.*mobility=wheelchair/,
  )

  // The host's device reloads: guests stay put, then follow again.
  await host.reload({ waitUntil: 'domcontentloaded' })
  await expect(guest).toHaveURL(/\/navigation\/tour\/[^/]+\/0\?/)
  // Clicks before hydration are lost: click until the host's modal opens.
  await expect(async () => {
    if (!(await host.getByRole('dialog').isVisible())) {
      await host.getByRole('button', { name: 'Open next stop' }).click({ timeout: 1_000 })
    }
    await expect(host.getByRole('dialog')).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await expect(guest.getByRole('dialog')).toBeVisible()
  await expect(guest).toHaveURL(/mobility=wheelchair/)
  await host.getByRole('dialog').getByRole('button', { name: 'Close' }).click()

  // Quiz with private results: the host sees "Finished", never the score.
  await host.goto(at(`/en/tour/${fixture!.tourId}/quiz?from=2`), {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    host.getByText('Scores stay private: each person sees only their own.'),
  ).toBeVisible()
  await expect(guest).toHaveURL(/\/it\/tour\/[^/]+\/quiz/)
  await takeQuiz(guest, {
    start: 'Inizia il quiz',
    next: 'Domanda successiva',
    done: 'Vedi il risultato',
  })
  await expect(guest).toHaveURL(/\/quiz\/result\//)
  await expect(host.getByText('Finished', { exact: true })).toBeVisible()
  await expect(host.getByText('1 of 1 finished')).toBeVisible()
  await expect(host.getByText(/^[0-2] of 2$/)).toHaveCount(0)

  // The guest reloads: the host still sees them as finished.
  await guest.reload({ waitUntil: 'domcontentloaded' })
  await guest.waitForTimeout(3_000)
  await expect(host.getByText('1 of 1 finished')).toBeVisible()

  // Ending the quiz, then reloading the host: the quiz stays ended.
  await host.getByRole('button', { name: 'End the quiz' }).click()
  await host.getByRole('dialog').getByRole('button', { name: 'End the quiz' }).click()
  await expect(host.getByRole('heading', { name: 'The quiz is over' })).toBeVisible()
  await host.reload({ waitUntil: 'domcontentloaded' })
  await expect(host.getByRole('heading', { name: 'The quiz is over' })).toBeVisible()
  await shot(host, 'group-results-private-host')

  await host.getByRole('button', { name: 'End the group tour' }).click()
  await host.getByRole('button', { name: 'End for everyone' }).click()
  await expect(guest.getByText('Il tour di gruppo è terminato')).toBeVisible()
})

test('leaving, switching groups, ending from each place, ended codes', async ({ browser }) => {
  const anna = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const luca = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const first = await openGroup(anna, 'Anna')
  await joinGroup(guest, `/en/room/${first}`, 'Marco')
  await expect(anna.getByText('2 in the group')).toBeVisible()
  await anna.getByRole('button', { name: 'Start the tour' }).click()
  await expect(guest).toHaveURL(/\/navigation\/tour\/[^/]+\/0/)

  // Leaving mid-tour: the panel's "Leave the group", then the guest is on their own.
  await guest.getByRole('button', { name: 'Your group, 2 people' }).click()
  await guest.getByRole('button', { name: 'Leave the group' }).click()
  await guest.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(guest.getByRole('button', { name: /Your group/ })).toHaveCount(0)
  await expect(anna.getByRole('button', { name: 'Your group, 1 person' })).toBeVisible()
  await anna.getByRole('button', { name: 'Open next stop' }).click()
  await expect(anna.getByRole('dialog')).toBeVisible()
  await guest.waitForTimeout(3_000)
  await expect(guest.getByRole('dialog')).toHaveCount(0)
  // A solo visitor gets the step controls back.
  await expect(guest.getByRole('button', { name: 'Open next stop' })).toBeVisible()

  // A second group (desktop host): joining while in one asks to leave it first.
  const second = await openGroup(luca, 'Luca')
  await joinGroup(guest, `/en/room/${second}`, 'Marco')
  await expect(guest.getByText('Waiting for Luca to start the tour')).toBeVisible()
  await guest.goto(at(`/en/room/${first}`), { waitUntil: 'domcontentloaded' })
  await expect(
    guest.getByText('Joining this group makes you leave your current one.'),
  ).toBeVisible()
  await shot(luca, 'group-waiting-host-desktop')

  // Leaving from the waiting room shows the join form again.
  await guest.goto(at(`/en/room/${second}`), { waitUntil: 'domcontentloaded' })
  await guest.getByRole('button', { name: 'Leave the group' }).click()
  await guest.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(guest.getByRole('button', { name: 'Join the group' })).toBeVisible()
  await expect(luca.getByText('1 in the group')).toBeVisible()

  // Ending from the waiting room: the code stops working.
  await luca.getByRole('button', { name: 'End the group tour' }).click()
  await luca.getByRole('button', { name: 'End for everyone' }).click()
  await expect(luca).toHaveURL(/\/en\/navigator/)
  await guest.goto(at(`/en/room/${second}`), { waitUntil: 'domcontentloaded' })
  await expect(guest.getByRole('heading', { name: 'This group has ended' })).toBeVisible()
  // A mistyped code gets the same page.
  await guest.goto(at('/en/room/ABC'), { waitUntil: 'domcontentloaded' })
  await expect(guest.getByRole('heading', { name: 'This group has ended' })).toBeVisible()

  // Ending from the map's group panel.
  await anna.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await anna.getByRole('button', { name: 'Your group, 1 person' }).click()
  await anna.getByRole('button', { name: 'End the group tour' }).click()
  await anna.getByRole('button', { name: 'End for everyone' }).click()
  await expect(anna.getByRole('button', { name: /Your group/ })).toHaveCount(0)
})

test('the quiz still works for a visitor touring alone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(at(`/en/tour/${fixture!.tourId}/quiz?from=2`), {
    waitUntil: 'domcontentloaded',
  })
  await takeQuiz(page)
  await expect(page).toHaveURL(/\/quiz\/result\//)
  await expect(page.getByRole('heading', { name: 'Your answers' })).toBeVisible()
})
