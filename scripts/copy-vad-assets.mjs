// Copies the voice-activity-detection runtime into public/vad so the browser
// can load it from our own origin (no CDN dependency during a visit):
// the Silero VAD model + audio worklet (@ricky0123/vad-web) and the
// onnxruntime-web WASM files that run the model. Runs on `postinstall`;
// the output is generated, so public/vad is gitignored.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const vadDist = dirname(require.resolve('@ricky0123/vad-web'))
// onnxruntime-web is vad-web's own dependency, so resolve it from there.
const ortDist = dirname(
  createRequire(join(vadDist, 'index.js')).resolve('onnxruntime-web/wasm'),
)
const target = join(process.cwd(), 'public', 'vad')
mkdirSync(target, { recursive: true })

const copy = (dir, test) => {
  for (const file of readdirSync(dir).filter(test)) copyFileSync(join(dir, file), join(target, file))
}
copy(vadDist, (file) => file === 'vad.worklet.bundle.min.js' || file === 'silero_vad_v5.onnx')
copy(ortDist, (file) => /^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(file))
console.log(`VAD assets copied to ${target}`)
