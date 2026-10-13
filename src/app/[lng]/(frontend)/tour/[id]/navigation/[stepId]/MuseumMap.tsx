'use client'

import { MapViewer } from '@/components/pascal/MapViewer'
import { ParsedBuildJson } from '@pascal-app/core'
import { useGLTF } from '@react-three/drei'

export function MuseumMap({ map, ...props }: { map: ParsedBuildJson } & typeof MapViewer) {
  const avatar = useGLTF('/public/avatar.glb')
  return <MapViewer map={map} {...props} />
}
