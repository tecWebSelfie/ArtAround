import {
  museumNavMeshOptions,
  wheelchairNavMeshOptions,
  type MuseumNavMeshProfile,
} from './navmesh-options'
import { DEFAULT_QUERY_FILTER, findPath, type Vec3 } from 'navcat'
import { generateSoloNavMesh, type SoloNavMeshInput } from 'navcat/blocks'

import { sceneRegistry, useScene } from '@pascal-app/core'
import {
  buildFirstPersonColliderWorldFromRegistry,
  type NavSceneRegistry,
} from '@pascal-app/editor'
import { getPositionsAndIndices } from 'navcat/three'

/**
 * Extracts only Pascal's navigation geometry, then lets the caller build one
 * or both saved visitor profiles from those same triangles.
 */
function fromNavSceneRegistry<T>(
  navSceneRegistry: NavSceneRegistry | undefined,
  build: (input: SoloNavMeshInput) => T,
): T | null {
  const world = navSceneRegistry
    ? null
    : buildFirstPersonColliderWorldFromRegistry({ includeNavSceneRegistry: true })

  try {
    // Pascal's navigation geometry excludes the large site ground collider.
    const meshes = Object.values(navSceneRegistry ?? world?.navSceneRegistry ?? {}).flatMap(
      (entry) => (entry ? [entry.object] : []),
    )
    if (meshes.length === 0) return null

    const [positions, indices] = getPositionsAndIndices(meshes)
    return build({ indices, positions })
  } finally {
    world?.dispose()
  }
}

/**
 * Resolves once Pascal has mounted every node of the loaded scene, or after
 * `timeoutMs`. Navigation geometry is read from the mounted meshes, and the
 * editor's own "scene ready" signal is not enough: when rendering is slow,
 * Pascal hides its loader after a fixed timeout with walls and slabs still
 * unmounted, and a save then would replace the museum's paths with an empty
 * navmesh. Polled on a timer, not on animation frames, which starve exactly
 * when mounting is slow.
 */
export function sceneMounted(timeoutMs = 60_000) {
  const mounted = () =>
    Object.keys(useScene.getState().nodes).every((id) => sceneRegistry.nodes.has(id))
  const deadline = Date.now() + timeoutMs
  return new Promise<void>((resolve) => {
    const check = () =>
      mounted() || Date.now() > deadline ? resolve() : void setTimeout(check, 100)
    check()
  })
}

/** Generate both visitor profiles from one extraction of Pascal navigation geometry. */
export function generateMuseumNavMeshesFromSceneRegistry(navSceneRegistry?: NavSceneRegistry) {
  return fromNavSceneRegistry(navSceneRegistry, (input) => ({
    pedestrian: generateSoloNavMesh(input, museumNavMeshOptions).navMesh,
    wheelchair: generateSoloNavMesh(input, wheelchairNavMeshOptions).navMesh,
  }))
}

export function generateNavMeshFromSceneRegistry(
  navSceneRegistry?: NavSceneRegistry,
  profile: MuseumNavMeshProfile = 'pedestrian',
) {
  const options = profile === 'wheelchair' ? wheelchairNavMeshOptions : museumNavMeshOptions
  return fromNavSceneRegistry(
    navSceneRegistry,
    (input) => generateSoloNavMesh(input, options).navMesh,
  )
}

export function exportMapNavMeshJson(navSceneRegistry?: NavSceneRegistry) {
  return JSON.stringify(generateNavMeshFromSceneRegistry(navSceneRegistry))
}

export function pascalFindPath(
  navSceneRegistry: NavSceneRegistry,
  start: Vec3,
  end: Vec3,
  halfExtents: Vec3 = [0.5, 0.5, 0.5],
) {
  const navMesh = generateNavMeshFromSceneRegistry(navSceneRegistry)

  if (!navMesh) {
    console.error('Failed to generate navmesh from scene registry, cannot find map path.')
    return
  }

  /* find a path */
  const pathFindingResult = findPath(navMesh, start, end, halfExtents, DEFAULT_QUERY_FILTER)

  console.log(
    'path:',
    pathFindingResult.path.map((p) => p.position),
  )
}
