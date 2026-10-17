'use client'

import { MapViewer } from '@/components/pascal/MapViewer'
import { ParsedBuildJson } from '@pascal-app/core'
import { BVHEcctrl } from '@pascal-app/viewer'
import { Gltf } from '@react-three/drei'

export function MuseumMap({ map, ...props }: { map: ParsedBuildJson } & typeof MapViewer) {
  return (
    <MapViewer map={map} {...props}>
      <BVHEcctrl>
        <Gltf src="/public/avatar.glb" />
      </BVHEcctrl>
    </MapViewer>
  )
}
