import { expect, test } from '@playwright/test'
import path from 'node:path'
import type { ParsedBuildJson } from '@pascal-app/core'

const editorURL =
  process.env.E2E_MAPEDITOR_URL ??
  'http://localhost:3000/it/museum/6ad215d05b159f24a7616019/edit/mapeditor'
const origin = new URL(editorURL).origin

// Uses the existing development account; does not seed users or change museum data.
test('Italian map editor opens its object catalog and validates generation input', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000)
  const runtimeErrors: string[] = []
  const generationWrites: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      /\/api\/objects\/(?:create-for-model|[^/]+\/generate-model)$/.test(
        new URL(request.url()).pathname,
      )
    ) {
      generationWrites.push(request.url())
    }
  })

  await test.step('authenticate through the existing Payload login endpoint', async () => {
    const login = await page.request.post(`${origin}/api/users/login`, {
      data: {
        username: process.env.E2E_USERNAME ?? 'dev',
        password: process.env.E2E_PASSWORD ?? 'test',
      },
    })
    expect(login.status()).toBe(200)
  })

  const catalogResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/objects' && response.request().method() === 'GET',
    { timeout: 90_000 },
  )

  await test.step('load the real editor and show the Italian toolbar tooltip', async () => {
    const response = await page.goto(editorURL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    expect(response?.status()).toBe(200)
    const tools = page.getByRole('group', { name: 'Strumenti di creazione del museo' })
    await expect(tools).toBeVisible({ timeout: 60_000 })
    for (const name of [
      'Disegna pareti',
      'Disegna una soletta',
      'Aggiungi una porta',
      'Aggiungi una finestra',
    ]) {
      const button = tools.getByRole('button', { name })
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
    }
    await tools.getByRole('button', { name: 'Seleziona oggetti' }).click()
    await expect(
      tools.getByRole('button', { name: 'Aggiungi una planimetria (SVG o immagine)' }),
    ).toBeEnabled()
    await page.screenshot({ path: testInfo.outputPath('museum-creation-toolbar.png') })
    const addObject = page.getByRole('button', { name: 'Aggiungi un oggetto alla mappa' })
    await expect(addObject).toBeVisible({ timeout: 60_000 })
    await addObject.hover()
    await expect(
      page.getByRole('tooltip', { name: 'Aggiungi un oggetto alla mappa' }),
    ).toBeVisible()
    await addObject.click()
  })

  await test.step('read the catalog from Payload and open the Mantine modal', async () => {
    expect((await catalogResponse).status()).toBe(200)
    const catalog = page.getByRole('region', { name: 'Catalogo degli oggetti' })
    await expect(catalog).toBeVisible()
    await catalog.getByRole('button', { name: 'Crea un nuovo oggetto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  await test.step('validate required fields and accept a reference image without submitting', async () => {
    const modal = page.getByRole('dialog')
    const title = modal.getByRole('textbox', { name: "Titolo dell'oggetto" })
    const prompt = modal.getByRole('textbox', { name: "Descrivi l'oggetto" })
    await modal.getByRole('button', { name: 'Genera anteprima' }).click()
    expect(await title.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(
      true,
    )
    expect(await prompt.evaluate((input: HTMLTextAreaElement) => input.validity.valueMissing)).toBe(
      true,
    )
    await title.fill('Oggetto di prova E2E')
    await prompt.fill('Un vaso in terracotta con due manici.')
    await modal.locator('input[type="file"]').setInputFiles(path.resolve('public/icons/cube.webp'))
    await expect(modal.getByText('cube.webp', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('object-generation-modal.png') })
    await modal.getByRole('button', { name: 'Chiudi' }).click()
    await expect(modal).not.toBeVisible()
    expect(generationWrites).toEqual([])
  })

  await test.step('handle SVG upload failures and create a persistent guide reference', async () => {
    // Capture autosaves and mock the upload so this check cannot change the real museum.
    let savedScene: ParsedBuildJson | undefined
    await page.route('**/api/museums/*', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue()
      savedScene = (route.request().postDataJSON() as { map: ParsedBuildJson }).map
      await route.fulfill({ json: { doc: { map: savedScene } } })
    })
    let rejectUpload = true
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="white" stroke="black"/></svg>'
    await page.route('**/api/museumMaps', async (route) => {
      await route.fulfill(
        rejectUpload
          ? { status: 503, json: { errors: [{ message: 'Upload failed' }] } }
          : {
              json: { doc: { id: 'e2e-floorplan', url: '/api/museumMaps/file/e2e-floorplan.svg' } },
            },
      )
    })
    await page.route('**/api/museumMaps/file/e2e-floorplan.svg', (route) =>
      route.fulfill({ contentType: 'image/svg+xml', body: svg }),
    )
    const file = { name: 'e2e-floorplan.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) }
    const picker = page.getByLabel('Scegli un file per la planimetria')
    const toolbar = page.getByRole('group', { name: 'Strumenti di creazione del museo' })
    await picker.setInputFiles(file)
    await expect(toolbar.getByRole('alert')).toHaveText(
      'Impossibile caricare la planimetria. Riprova.',
    )
    rejectUpload = false
    await picker.setInputFiles(file)
    await expect
      .poll(() => Object.values(savedScene?.nodes ?? {}))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'guide',
            name: file.name,
            url: `${origin}/api/museumMaps/file/e2e-floorplan.svg`,
          }),
        ]),
      )
    await expect(toolbar.getByRole('alert')).toHaveCount(0)
  })

  expect(runtimeErrors).toEqual([])
})
