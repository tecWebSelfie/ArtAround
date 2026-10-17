import type { NavMesh as SourceNavMesh } from 'navcat'

// typescript-json-schema 0.68 drops Record value types. Index signatures keep
// those values intact while deriving every property type from Navcat.
export interface NavMesh
  extends Omit<
    SourceNavMesh,
    | 'tiles'
    | 'offMeshConnections'
    | 'offMeshConnectionAttachments'
    | 'tilePositionToTileId'
    | 'tileColumnToTileIds'
    | 'tilePositionToSequenceCounter'
  > {
  tiles: { [key: string]: SourceNavMesh['tiles'][string] }
  offMeshConnections: { [key: string]: SourceNavMesh['offMeshConnections'][string] }
  offMeshConnectionAttachments: {
    [key: string]: SourceNavMesh['offMeshConnectionAttachments'][string]
  }
  tilePositionToTileId: { [key: string]: SourceNavMesh['tilePositionToTileId'][string] }
  tileColumnToTileIds: { [key: string]: SourceNavMesh['tileColumnToTileIds'][string] }
  tilePositionToSequenceCounter: {
    [key: string]: SourceNavMesh['tilePositionToSequenceCounter'][string]
  }
}
