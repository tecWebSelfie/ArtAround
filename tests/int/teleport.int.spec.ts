import type { AnyNode } from '@pascal-app/core'
import type { NavSceneRegistry } from '@pascal-app/editor'
import { BoxGeometry, Group, Mesh, PlaneGeometry } from 'three'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { generateNavMeshFromSceneRegistry } from '@/lib/pascal/utils'
import { museumNavigationPath, objectNavigationPoint } from '@/lib/pascal/navigation'
import { tourNavigationPath, withNavigationValue } from '@/lib/tour-navigation'

/**
 * The teleport module (project requirements, extension 18-33: "a teleport
 * module that takes me to a preset position next to each of the objects in
 * the tour"). In ArtAround the visitor picks a work and "Set as my position"
 * (`NavigationObjectActions`); the confirmed position is `?at=OBJECT_ID`, and
 * the map places the avatar on the walkable floor next to that work
 * (`objectNavigationPoint`).
 *
 * Two seams: the URL the action writes (`withNavigationValue`), which must
 * move the visitor without touching the tour; and the preset point the map
 * derives from the saved navigation mesh, which must be next to the work, on
 * the floor, and reachable from the other works.
 */
vi.mock('@pascal-app/editor', () => ({ buildFirstPersonColliderWorldFromRegistry: vi.fn() }))

const TOUR = tourNavigationPath('it', 'museum1', 'tour1', 2)

describe('teleporting next to a work', () => {
  it('moves the visitor to the chosen work, keeping the tour step and mobility', () => {
    expect(withNavigationValue(TOUR, 'mobility=wheelchair', 'at', 'work7')).toBe(
      `${TOUR}?at=work7&mobility=wheelchair`,
    )
  })

  it('replaces the previous position instead of adding another', () => {
    expect(withNavigationValue(TOUR, 'at=work7&to=work9', 'at', 'work9')).toBe(
      `${TOUR}?at=work9&to=work9`,
    )
  })

  it('drops the position when the visitor clears it', () => {
    expect(withNavigationValue(TOUR, 'at=work7', 'at', null)).toBe(TOUR)
  })
})

describe('the preset position of each work', () => {
  // A 20 m × 10 m hall with three works standing on the floor.
  const floor = new Mesh(new PlaneGeometry(20, 10).rotateX(-Math.PI / 2))
  const registry: NavSceneRegistry = {
    'fallback-level:level_hall': { node: { type: 'level' } as AnyNode, object: floor },
  }
  const mesh = generateNavMeshFromSceneRegistry(registry)!
  const works = (
    [
      [-7, -3],
      [0, 3],
      [6, -2],
    ] as const
  ).map(([x, z]) => {
    const exhibit = new Group()
    exhibit.position.set(x, 0, z)
    const body = new Mesh(new BoxGeometry(1, 2, 0.5))
    body.position.y = 1
    exhibit.add(body)
    return { x, z, body }
  })

  afterAll(() => {
    floor.geometry.dispose()
    for (const { body } of works) body.geometry.dispose()
  })

  it('stands within a step of every work, on the floor', () => {
    for (const { x, z, body } of works) {
      const point = objectNavigationPoint(mesh, body)
      expect(point).not.toBeNull()
      const [px, py, pz] = point!
      expect(Math.hypot(px - x, pz - z)).toBeLessThan(1)
      expect(Math.abs(py)).toBeLessThan(0.6)
    }
  })

  it('lets the visitor walk from each preset position to the next work', () => {
    const points = works.map(({ body }) => objectNavigationPoint(mesh, body)!)
    for (let i = 1; i < points.length; i++) {
      expect(museumNavigationPath(mesh, points[i - 1]!, points[i]!)).not.toBeNull()
    }
  })
})
