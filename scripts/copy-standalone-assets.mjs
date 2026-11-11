import { cp, rm, stat } from 'node:fs/promises'

// Runs right after `next build` (the `build` script in package.json).
// `output: 'standalone'` traces only server code into `.next/standalone`;
// Next leaves the browser assets out on purpose, expecting a CDN. This app
// serves them itself, so `node .next/standalone/server.js` needs `public/`
// (icons, fonts, VAD/zxing/maplibre/draco files) and `.next/static` (the
// client chunks) beside it, or pages load without JS and images 404.
const standalone = new URL('../.next/standalone/', import.meta.url)

// A build without standalone output (or one that failed before writing it)
// has nothing to complete.
const exists = await stat(standalone).then(
  () => true,
  () => false,
)
if (!exists) process.exit(0)

const copies = [
  [new URL('../public/', import.meta.url), new URL('public/', standalone)],
  [new URL('../.next/static/', import.meta.url), new URL('.next/static/', standalone)],
]
for (const [source, destination] of copies) {
  // Replace instead of merge, so chunks of an older build don't pile up.
  await rm(destination, { recursive: true, force: true })
  await cp(source, destination, { recursive: true })
}
