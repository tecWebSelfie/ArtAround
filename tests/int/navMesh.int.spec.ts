import type { AnyNode } from '@pascal-app/core'
import {
  buildFirstPersonColliderWorldFromRegistry,
  type NavSceneRegistry,
} from '@pascal-app/editor'
import { Mesh, PlaneGeometry } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateNavMeshFromSceneRegistry } from '@/lib/pascal/utils'

vi.mock('@pascal-app/editor', () => ({
  buildFirstPersonColliderWorldFromRegistry: vi.fn(),
}))

const plane = new Mesh(new PlaneGeometry(10, 10).rotateX(-Math.PI / 2))
const registry: NavSceneRegistry = {
  'fallback-level:level_test': { node: { type: 'level' } as AnyNode, object: plane },
}

afterEach(() => vi.resetAllMocks())

describe('navigation geometry used when saving a museum', () => {
  it('generates only navigation surfaces and disposes the temporary collider world', () => {
    const dispose = vi.fn()
    const siteGround = new Mesh(new PlaneGeometry(2000, 2000))
    vi.mocked(buildFirstPersonColliderWorldFromRegistry).mockReturnValue({
      mesh: siteGround,
      navSceneRegistry: registry,
      bounds: null,
      dispose,
    })

    const started = performance.now()
    const navMesh = generateNavMeshFromSceneRegistry()
    console.info(`10m navigation surface generated in ${Math.round(performance.now() - started)}ms`)

    expect(buildFirstPersonColliderWorldFromRegistry).toHaveBeenCalledWith({
      includeNavSceneRegistry: true,
    })
    expect(Object.values(navMesh!.tiles)).toHaveLength(1)
    const tile = Object.values(navMesh!.tiles)[0]
    expect(tile.polys.length).toBeGreaterThan(0)
    expect(tile.bounds[0]).toBeGreaterThanOrEqual(-5.2)
    expect(tile.bounds[3]).toBeLessThanOrEqual(5.2)
    expect(JSON.parse(JSON.stringify(navMesh))).toEqual(navMesh)
    expect(dispose).toHaveBeenCalledOnce()
    siteGround.geometry.dispose()
  })

  it('reuses a supplied navigation registry without creating a collider world', () => {
    expect(generateNavMeshFromSceneRegistry(registry)).not.toBeNull()
    expect(buildFirstPersonColliderWorldFromRegistry).not.toHaveBeenCalled()
  })

  it('handles empty scenes and still disposes a world without navigation surfaces', () => {
    const dispose = vi.fn()
    vi.mocked(buildFirstPersonColliderWorldFromRegistry).mockReturnValue({
      mesh: plane,
      navSceneRegistry: {},
      bounds: null,
      dispose,
    })
    expect(generateNavMeshFromSceneRegistry()).toBeNull()
    expect(dispose).toHaveBeenCalledOnce()

    vi.mocked(buildFirstPersonColliderWorldFromRegistry).mockReturnValue(null)
    expect(generateNavMeshFromSceneRegistry()).toBeNull()
  })

  it('disposes collider geometry when extracting navigation input fails', () => {
    const dispose = vi.fn()
    vi.mocked(buildFirstPersonColliderWorldFromRegistry).mockReturnValue({
      mesh: plane,
      get navSceneRegistry(): NavSceneRegistry {
        throw new Error('Geometry unavailable')
      },
      bounds: null,
      dispose,
    })
    expect(() => generateNavMeshFromSceneRegistry()).toThrow('Geometry unavailable')
    expect(dispose).toHaveBeenCalledOnce()
  })
})
