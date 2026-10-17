import { expect, test } from '@playwright/test'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import type { ParsedBuildJson } from '@pascal-app/core'
import type { NavMesh } from 'navcat'

const editorURL =
  process.env.E2E_MAPEDITOR_URL ??
  'http://localhost:3000/it/museum/6ad215d05b159f24a7616019/edit/mapeditor'
const origin = new URL(editorURL).origin

test('map editor awaits navmesh saves and recovers from a rejected save', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000)
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message)
    console.info(`Editor runtime error: ${error.message}`)
  })
  const login = await page.request.post(`${origin}/api/users/login`, {
    data: {
      username: process.env.E2E_USERNAME ?? 'dev',
      password: process.env.E2E_PASSWORD ?? 'test',
    },
  })
  expect(login.status()).toBe(200)

  const saves: { map: ParsedBuildJson; navMesh: NavMesh }[] = []
  let releaseSave!: () => void
  const heldSave = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  await page.route('**/api/museums/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue()
    saves.push(route.request().postDataJSON())
    if (saves.length === 1) {
      await heldSave
      return route.fulfill({ status: 503, json: { errors: [{ message: 'Save unavailable' }] } })
    }
    // Keep every test save in memory; never write to the actual museum.
    await route.fulfill({ json: { doc: { ...saves.at(-1), id: 'e2e-museum' } } })
  })

  try {
    await page.goto(editorURL, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    const toolbar = page.getByRole('group', { name: 'Strumenti di creazione del museo' })
    await expect(toolbar).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2000)

    const started = Date.now()
    await page.keyboard.press('Control+s')
    await expect.poll(() => saves.length, { timeout: 30_000 }).toBe(1)
    const generationAndDispatchMs = Date.now() - started
    console.info(`Navmesh generation and save dispatch: ${generationAndDispatchMs}ms`)
    await testInfo.attach('navmesh-save-timing', {
      body: JSON.stringify({ generationAndDispatchMs }),
      contentType: 'application/json',
    })
    await testInfo.attach('saved-map-and-navmesh', {
      body: JSON.stringify(saves[0]),
      contentType: 'application/json',
    })
    await writeFile(testInfo.outputPath('saved-map-and-navmesh.json'), JSON.stringify(saves[0]))
    await page.screenshot({ path: testInfo.outputPath('navmesh-save.png') })
    console.info(
      `Saved ${Object.keys(saves[0].map.nodes).length} scene nodes, ${Object.keys(saves[0].navMesh.tiles).length} navigation tiles`,
    )
    expect(saves[0].map.nodes).toBeDefined()
    expect(saves[0].navMesh).toMatchObject({
      tiles: expect.any(Object),
      nodes: expect.any(Array),
      origin: expect.any(Array),
    })
    expect(Object.values(saves[0].navMesh.tiles).some((tile) => tile.polys.length > 0)).toBe(true)

    // Editing controls remain usable while onSave's promise is pending.
    const wall = toolbar.getByRole('button', { name: 'Disegna pareti' })
    await wall.click()
    await expect(wall).toHaveAttribute('aria-pressed', 'true')
    await toolbar.getByRole('button', { name: 'Seleziona oggetti' }).click()
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1200)
    expect(saves).toHaveLength(1)

    // Pascal queues the next save, even when the pending request fails.
    releaseSave()
    await expect.poll(() => saves.length, { timeout: 15_000 }).toBe(2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+s')
    await expect.poll(() => saves.length, { timeout: 15_000 }).toBe(3)
    expect(runtimeErrors).toEqual([])
  } finally {
    releaseSave()
  }
})

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
