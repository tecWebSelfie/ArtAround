import type { SoloNavMeshOptions } from 'navcat/blocks'

/** Metre-based visitor profiles used when the editor saves both route networks. */
const profiles = {
  pedestrian: { radius: 0.25, climb: 0.17, slope: 35 },
  wheelchair: { radius: 0.35, climb: 0.02, slope: 4.57 },
} as const

export type MuseumNavMeshProfile = keyof typeof profiles

function optionsFor(profile: MuseumNavMeshProfile): SoloNavMeshOptions {
  const { radius, climb, slope } = profiles[profile]
  const cellSize = 0.025
  // NavCat caps compact-span clearance at 255 voxels; 5 mm cannot represent
  // the required 2 m (400 voxels) and produces empty meshes. 1 cm can.
  const cellHeight = 0.01
  return {
    cellSize,
    cellHeight,
    walkableRadiusWorld: radius,
    walkableRadiusVoxels: Math.ceil(radius / cellSize),
    walkableClimbWorld: climb,
    walkableClimbVoxels: Math.ceil(climb / cellHeight),
    walkableHeightWorld: 2,
    walkableHeightVoxels: Math.ceil(2 / cellHeight),
    walkableSlopeAngleDegrees: slope,
    borderSize: 0,
    minRegionArea: 8,
    mergeRegionArea: 20,
    maxSimplificationError: 1.3,
    maxEdgeLength: 12,
    maxVerticesPerPoly: 5,
    detailSampleDistance: cellSize * 6,
    detailSampleMaxError: cellHeight,
  }
}

export const museumNavMeshOptions = optionsFor('pedestrian')
export const wheelchairNavMeshOptions = optionsFor('wheelchair')
