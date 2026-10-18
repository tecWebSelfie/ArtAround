# Tour navigation checks

Seed a separate development museum with two ordered tour contents, one extra content,
three placed objects and a saved navmesh:

```powershell
pnpm exec tsx scripts/seed-tour-navigation.ts
```

The seed reuses its `[DEV] Tour navigation` records on subsequent runs. It does not
queue model generation. It prints the tour URL and saves it in
`test-results/tour-navigation-fixture.json`.

With Next.js already running, run only this feature's browser checks:

```powershell
$env:TOUR_NAVIGATION_URL = (Get-Content test-results/tour-navigation-fixture.json | ConvertFrom-Json).url
$env:PLAYWRIGHT_USE_RUNNING_SERVER = 'true'
$env:PLAYWRIGHT_CHANNEL = 'chrome' # Use installed Chrome; omit for Playwright Chromium.
pnpm exec playwright test tests/e2e/tour-navigation.e2e.spec.ts tests/e2e/tour-qr.e2e.spec.ts --workers 1
```

The QR tests supply a generated QR image through a synthetic camera stream. They
exercise the real decoder and Next.js navigation without requiring camera access.
The tests cover the default map view, side exploration,
position sharing, ordered progression and canonical QR links with reloadable modals.

Cold development-route compilation can take several minutes on this project.
The integration checks can be run independently:

```powershell
pnpm exec vitest run --config vitest.config.mts --pool threads --maxWorkers 1 tests/int/navMesh.int.spec.ts tests/int/tour-navigation.int.spec.ts
```
