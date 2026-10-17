import { DEFAULT_QUERY_FILTER, findPath, type Vec3 } from 'navcat'
import { generateSoloNavMesh, type SoloNavMeshOptions } from 'navcat/blocks'

import {
  buildFirstPersonColliderWorldFromRegistry,
  type NavSceneRegistry,
} from '@pascal-app/editor'
import { getPositionsAndIndices } from 'navcat/three'

/* generation options */
// the following are defaults you might start from for a human-sized agent in a 1 m scale world.
// it's generally recommended that you use the library debug helpers to visualize the navmesh
// generation and fine tune these parameters.

// heightfield parameters
const cellSize = 0.15
const cellHeight = 0.25

// agent parameters
const walkableRadiusWorld = 0.3
const walkableHeightWorld = 2.0
const walkableClimbWorld = 0.5
const walkableSlopeAngleDegrees = 45

const walkableRadiusVoxels = Math.ceil(walkableRadiusWorld / cellSize)
const walkableClimbVoxels = Math.ceil(walkableClimbWorld / cellHeight)
const walkableHeightVoxels = Math.ceil(walkableHeightWorld / cellHeight)

// compact heightfield region parameters
const minRegionArea = 8
const mergeRegionArea = 20

// polygon generation parameters
const maxSimplificationError = 1.3
const maxEdgeLength = 12
const maxVerticesPerPoly = 5

// detail mesh generation parameters
const detailSampleDistanceVoxels = 6
const detailSampleMaxErrorVoxels = 1

const detailSampleDistance =
  detailSampleDistanceVoxels < 0.9 ? 0 : cellSize * detailSampleDistanceVoxels
const detailSampleMaxError = cellHeight * detailSampleMaxErrorVoxels

// border size around each tile, in voxels. 0 for solo navmesh.
const borderSize = 0

const options: SoloNavMeshOptions = {
  cellSize,
  cellHeight,
  walkableRadiusWorld,
  walkableRadiusVoxels,
  walkableClimbWorld,
  walkableClimbVoxels,
  walkableHeightWorld,
  walkableHeightVoxels,
  walkableSlopeAngleDegrees,
  borderSize,
  minRegionArea,
  mergeRegionArea,
  maxSimplificationError,
  maxEdgeLength,
  maxVerticesPerPoly,
  detailSampleDistance,
  detailSampleMaxError,
}

// remember: type NavSceneRegistryKey = AnyNodeId | `fallback-level:${AnyNodeId}`

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
    return generateSoloNavMesh({ indices, positions }, options).navMesh
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
