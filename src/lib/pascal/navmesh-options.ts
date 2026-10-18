import type { SoloNavMeshOptions } from 'navcat/blocks'

/**
 * Shared navmesh settings for map generation and editor persistence. Keeping one
 * human-scale profile makes saved routes match the visitor navigation runtime.
 */
// Starting values for a human-sized visitor in a 1 m scale world; visualize and
// tune with navcat's debug helpers when the museum geometry requires it.

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

export const museumNavMeshOptions: SoloNavMeshOptions = {
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
