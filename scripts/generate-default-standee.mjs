/**
 * Generates `public/models/default-standee.glb`, the DEFAULT model of museum
 * objects that have no Mint model yet (generation failed, pending or never
 * started). The map editor's object catalog falls back to it in
 * `objectAsset()` (`src/lib/pascal/object-assets.ts`) so every object can be
 * placed on the museum map; see docs/interactive-object-models.md.
 *
 * The model is a plain exhibition info standee — the lectern-style stand
 * placed next to an artwork: small base plate, slim post, slanted info panel.
 * Pascal renders item GLBs at their native size (it never fits them to
 * `asset.dimensions`), so the geometry is in real-world metres, origin at the
 * floor centre, +Y up, reading side facing +Z. If you change the size, update
 * `DEFAULT_MODEL_DIMENSIONS` in `object-assets.ts` to the printed bounding box.
 *
 * Run with `pnpm models:standee`. The script round-trips the result through
 * GLTFLoader and prints its bounding box as a sanity check.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const OUTPUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/models/default-standee.glb',
)

// GLTFExporter's binary path packs chunks into a Blob and reads it back with
// FileReader. Node has Blob but no FileReader: this is the minimal subset the
// exporter calls (readAsArrayBuffer / readAsDataURL + onloadend).
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null
    onload = null
    onloadend = null
    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer()
      this.onload?.({ target: this })
      this.onloadend?.({ target: this })
    }
    async readAsDataURL(blob) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${base64}`
      this.onload?.({ target: this })
      this.onloadend?.({ target: this })
    }
  }
}

// --- Dimensions (metres) ----------------------------------------------------
const BASE = { width: 0.32, height: 0.012, depth: 0.26 }
const POST = { width: 0.04, depth: 0.04, top: 0.95 }
const PANEL = { width: 0.35, depth: 0.25, thickness: 0.02, tilt: THREE.MathUtils.degToRad(30) }
// Light reading face, inset from the dark panel edge so it reads as a framed sign.
const FACE = { inset: 0.015, thickness: 0.004 }

// Matte, neutral materials: the standee must not compete with the artwork.
const frameMaterial = new THREE.MeshStandardMaterial({
  name: 'standee-frame',
  color: 0x3a3d42,
  roughness: 0.85,
  metalness: 0.1,
})
const faceMaterial = new THREE.MeshStandardMaterial({
  name: 'standee-face',
  color: 0xf2efe8,
  roughness: 0.9,
  metalness: 0,
})

function box(name, [width, height, depth], material, [x, y, z]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.name = name
  mesh.position.set(x, y, z)
  return mesh
}

const standee = new THREE.Group()
standee.name = 'default-standee'

standee.add(
  box('base', [BASE.width, BASE.height, BASE.depth], frameMaterial, [0, BASE.height / 2, 0]),
)
const postHeight = POST.top - BASE.height
standee.add(
  box('post', [POST.width, postHeight, POST.depth], frameMaterial, [
    0,
    BASE.height + postHeight / 2,
    0,
  ]),
)

// The panel pivots on its centre above the post. Rotating +tilt around X turns
// its top normal from +Y to (0, cos, sin): up and towards the reader at +Z,
// with the front edge lower than the back edge like a lectern.
const halfDrop = (PANEL.depth / 2) * Math.sin(PANEL.tilt)
const panel = new THREE.Group()
panel.name = 'panel'
panel.position.set(0, POST.top + halfDrop + PANEL.thickness / 2, 0)
panel.rotation.x = PANEL.tilt
panel.add(box('panel-frame', [PANEL.width, PANEL.thickness, PANEL.depth], frameMaterial, [0, 0, 0]))
panel.add(
  box(
    'panel-face',
    [PANEL.width - FACE.inset * 2, FACE.thickness, PANEL.depth - FACE.inset * 2],
    faceMaterial,
    // Half-embedded in the frame so the face stands proud by half its thickness.
    [0, PANEL.thickness / 2, 0],
  ),
)
standee.add(panel)

// A short bracket hides the joint between the square post and the tilted panel.
standee.add(box('bracket', [0.08, 0.04, 0.08], frameMaterial, [0, POST.top, 0]))

const glb = await new GLTFExporter().parseAsync(standee, { binary: true })
await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, Buffer.from(glb))

// Round-trip check: the file parses and has the intended real-world size.
const loaded = await new GLTFLoader().parseAsync(glb, '')
const size = new THREE.Box3().setFromObject(loaded.scene).getSize(new THREE.Vector3())
const min = new THREE.Box3().setFromObject(loaded.scene).min
console.log(`Wrote ${OUTPUT} (${glb.byteLength} bytes)`)
console.log(
  `Bounding box (m): ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)}; floor at y=${min.y.toFixed(3)}`,
)
