'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Tinting a cached GLB without corrupting the `useGLTF` cache: the per-instance
 * clone shares the cached geometries (never disposed here) while each mesh gets
 * a material clone. The material cache is bounded — one entry per source
 * material × marker color — so it is intentionally never disposed.
 */
const tintCache = new Map<string, THREE.Material>()

function tinted(source: THREE.Material, color: string): THREE.Material {
  const key = `${source.uuid}:${color}`
  const cached = tintCache.get(key)
  if (cached) return cached
  const material = source.clone() as THREE.Material & { color?: THREE.Color }
  material.color?.set(color)
  tintCache.set(key, material)
  return material
}

/** Colored, per-instance clone of a cached GLB (the exit / entrance marker). */
export function TintedModel({
  url,
  color,
  scale = 1,
}: {
  url: string
  color: string
  scale?: number
}) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        mesh.material = tinted(source, color)
      }
    })
    return clone
  }, [scene, color])

  return <primitive object={model} scale={scale} />
}
