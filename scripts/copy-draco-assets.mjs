import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// Drei's GLTF loader needs both the JS wrapper and matching WASM decoder from the installed Three.
const require = createRequire(import.meta.url)
const source = path.resolve(path.dirname(require.resolve('three')), '../examples/jsm/libs/draco/gltf')
const destination = new URL('../public/draco/', import.meta.url)
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })
