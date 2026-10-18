import { museumNavMeshOptions } from './navmesh-options'
import { DEFAULT_QUERY_FILTER, findPath, type Vec3 } from 'navcat'
import { generateSoloNavMesh } from 'navcat/blocks'

import {
  buildFirstPersonColliderWorldFromRegistry,
  type NavSceneRegistry,
} from '@pascal-app/editor'
import { getPositionsAndIndices } from 'navcat/three'

/**
 * Builds the walkable surface from Pascal's collider registry (not every scene
 * mesh), using the same profile as the saved museum navmesh consumed by tours.
 */
export function generateNavMeshFromSceneRegistry(navSceneRegistry?: NavSceneRegistry) {
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
    return generateSoloNavMesh({ indices, positions }, museumNavMeshOptions).navMesh
  } finally {
    world?.dispose()
  }
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
