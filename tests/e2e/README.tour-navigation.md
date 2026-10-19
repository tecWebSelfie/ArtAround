# Tour navigation checks

Seed a separate development museum with two ordered tour contents, one extra content,
three placed objects and a saved navmesh:

```powershell
pnpm exec tsx scripts/seed-tour-navigation.ts
```

The seed reuses its `[DEV] Tour navigation` records on subsequent runs. It does not
queue model generation. It prints the tour URL and saves it in
`.e2e-fixtures/tour-navigation-fixture.json`.

With Next.js already running, run only this feature's browser checks:

```powershell
$env:TOUR_NAVIGATION_URL = (Get-Content .e2e-fixtures/tour-navigation-fixture.json | ConvertFrom-Json).url
$env:PLAYWRIGHT_USE_RUNNING_SERVER = 'true'
$env:PLAYWRIGHT_CHANNEL = 'chrome' # Use installed Chrome; omit for Playwright Chromium.
node node_modules/@playwright/test/cli.js test tests/e2e/tour-navigation.e2e.spec.ts tests/e2e/tour-qr.e2e.spec.ts --workers 1
```

Use `@playwright/test`'s own CLI as above: `pnpm exec playwright` resolves the
newer `playwright` package (installed for Vitest browser mode), and a version
mismatch with the specs' `@playwright/test` makes every spec fail to load.

Route guidance and the voice assistant (they read the fixture file directly):

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/tour-guidance.e2e.spec.ts tests/e2e/voice-assistant.e2e.spec.ts --workers 1
```

- `tour-guidance`: simulated GPS (needs `NEXT_PUBLIC_GPS_SIMULATOR=true` in the
  server's env) advances the directions and suggests the East hall's off-tour content.
- `voice-assistant`: Chromium plays `tests/e2e/fixtures/open-side-discovery.wav`
  as the microphone; the orb's turn must open that content. Needs `GROQ_API_KEY`
  and `FISH_API_KEY`. In `next dev` the first run can time out while the content
  modal route compiles; rerun it.

The QR tests supply a generated QR image through a synthetic camera stream. They
exercise the real decoder and Next.js navigation without requiring camera access.
The tests cover the default map view, side exploration,
position sharing, ordered progression and canonical QR links with reloadable modals.

Cold development-route compilation can take several minutes on this project.
The integration checks can be run independently:

```powershell
pnpm exec vitest run --config vitest.config.mts --pool threads --maxWorkers 1 tests/int/navMesh.int.spec.ts tests/int/tour-navigation.int.spec.ts
```
