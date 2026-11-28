import { expect, test } from '@playwright/test'
import { requireTourFixture } from '../../helpers/tour-fixture'

/**
 * Nightly QA 2026-11-28 (area A, flow 3: ShareButton, PR #30-#32).
 *
 * ShareButton is "the share action of a tour, object or content page": the
 * link and the on-screen code for every visitor, plus the printable downloads
 * for the museum's staff only (`printMuseumId`). The tour page renders it for
 * everybody, but the object and content pages wrap it in `printMuseumId && ...`
 * (object/[id]/page.tsx, content/[id]/page.tsx), so only staff see any share
 * action there; an anonymous visitor or a signed-in visitor can neither share
 * the link nor show the code of an object or a content.
 *
 * Correct behaviour: every visitor gets the Share button on the three pages,
 * and only staff get the download links in its dialog.
 */
test.setTimeout(120_000)

test('a plain visitor can share an object and a content page, without the staff downloads', async ({
  page,
  request,
}) => {
  const fixture = requireTourFixture()
  const origin = new URL(fixture.url).origin
  const object = await (
    await request.get(`${origin}/api/objects/${fixture.objectIds[0]}?depth=0`)
  ).json()
  const contentId = String(object.contents[0])

  for (const path of [
    `/en/tour/${fixture.tourId}`,
    `/en/object/${fixture.objectIds[0]}`,
    `/en/content/${contentId}`,
  ]) {
    await page.goto(origin + path)
    const share = page.getByRole('button', { name: 'Share', exact: true })
    await expect(share, path).toBeVisible()
    await share.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // The link and code carry no museum parameter; the downloads are staff-only.
    await expect(dialog.getByRole('button', { name: 'Share link' })).toBeVisible()
    await expect(dialog.locator('a[download]')).toHaveCount(0)
    await page.keyboard.press('Escape')
  }
})
