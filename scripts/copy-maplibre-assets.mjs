// MapLibre 6 workers import a sibling shared module; keep the pair on our own origin for Next builds.
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const source = dirname(fileURLToPath(import.meta.resolve('maplibre-gl')))
const target = join(process.cwd(), 'public', 'maplibre')
mkdirSync(target, { recursive: true })
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(source, name), join(target, name))
}
console.log(`MapLibre worker assets copied to ${target}`)
