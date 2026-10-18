import type { AnyNode } from '@pascal-app/core'
import {
  buildFirstPersonColliderWorldFromRegistry,
  type NavSceneRegistry,
} from '@pascal-app/editor'
import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateMuseumNavMeshesFromSceneRegistry, generateNavMeshFromSceneRegistry } from '@/lib/pascal/utils'
import { museumNavigationPath, objectNavigationPoint } from '@/lib/pascal/navigation'

vi.mock('@pascal-app/editor', () => ({
  buildFirstPersonColliderWorldFromRegistry: vi.fn(),
}))

const plane = new Mesh(new PlaneGeometry(10, 10).rotateX(-Math.PI / 2))
const registry: NavSceneRegistry = {
  'fallback-level:level_test': { node: { type: 'level' } as AnyNode, object: plane },
}

afterEach(() => vi.resetAllMocks())

describe('navigation geometry used when saving a museum', () => {
  it('routes a 10 degree ramp for walkers but excludes it for wheelchairs', () => {
    const ramp = new Mesh(new PlaneGeometry(2, 2).rotateX(-Math.PI / 2 + Math.atan(0.1)))
    const profiles = generateMuseumNavMeshesFromSceneRegistry({
      'fallback-level:level_ramp': { node: { type: 'level' } as AnyNode, object: ramp },
    })!
    expect(museumNavigationPath(profiles.pedestrian, [0, 0.05, -0.5], [0, -0.05, 0.5])).not.toBeNull()
    expect(museumNavigationPath(profiles.wheelchair, [0, 0.05, -0.5], [0, -0.05, 0.5])).toBeNull()
    ramp.geometry.dispose()
  })
  it('uses the saved navmesh and world transforms for a confirmed object position', () => {
    const mesh = generateNavMeshFromSceneRegistry(registry)!
    const exhibit = new Group()
    exhibit.position.set(2, 0, -1)
    const object = new Mesh(new BoxGeometry(1, 2, 1))
    object.position.y = 1
    exhibit.add(object)
    const point = objectNavigationPoint(mesh, object)!
    expect(point[0]).toBeCloseTo(2)
    expect(point[2]).toBeCloseTo(-1)
    expect(point[1]).toBeLessThan(0.6)
    expect(museumNavigationPath(mesh, point, [-2, 0, 2])?.length).toBeGreaterThan(1)
    expect(buildFirstPersonColliderWorldFromRegistry).not.toHaveBeenCalled()
    object.geometry.dispose()
  })

  it('does not present a partial path between disconnected floors as a complete route', () => {
    const otherFloor = new Mesh(new PlaneGeometry(10, 10).rotateX(-Math.PI / 2))
    otherFloor.position.x = 20
    const mesh = generateNavMeshFromSceneRegistry({
      ...registry,
      'fallback-level:level_other': { node: { type: 'level' } as AnyNode, object: otherFloor },
    })!
    expect(museumNavigationPath(mesh, [0, 0, 0], [20, 0, 0])).toBeNull()
    otherFloor.geometry.dispose()
  })

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
