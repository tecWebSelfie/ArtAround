// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { NavigationProximity } from '@/app/[lng]/(frontend)/museum/[id]/navigation/NavigationProximity'
import type { MuseumRooms } from '@/lib/museum-rooms'

/**
 * The live "which work is in front of you?" notice (`NavigationProximity`),
 * rendered for real: only the sensor readings (plan point, heading) are
 * inputs chosen by the test.
 *
 * Plan: two rooms side by side, 0–10 and 10–20 on x, with a corridor-like gap
 * nowhere in a room at x 9.5–10.5. The work "east" hangs in the east room
 * just behind the dividing wall.
 */
afterEach(cleanup)

// jsdom has no `matchMedia`, which Mantine reads for the color scheme.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

const square = (x0: number, x1: number) =>
  [
    [x0, 0],
    [x1, 0],
    [x1, 10],
    [x0, 10],
  ] as [number, number][]

const rooms: MuseumRooms = {
  rooms: [
    { id: 'west', name: 'West', polygon: square(0, 9.5) },
    { id: 'east', name: 'East', polygon: square(10.5, 20) },
  ],
  doors: [],
  objects: [
    { objectId: 'west-work', point: [8, 5] },
    { objectId: 'east-work', point: [11.5, 5] },
  ],
}

const catalog = [
  { id: 'west-work', name: 'West work', contents: [] },
  { id: 'east-work', name: 'East work', contents: [] },
]

type Props = ComponentProps<typeof NavigationProximity>
const base: Props = {
  point: null,
  heading: null,
  rooms,
  catalog,
  nextId: null,
  tourObjectIds: new Set(),
  discoveries: true,
  scopeKey: 'museum:at:device:',
  onOpen: () => {},
  onConfirm: () => {},
}

const renderProximity = (props: Partial<Props>) => {
  const view = render(
    <MantineProvider>
      <NavigationProximity {...base} {...props} />
    </MantineProvider>,
  )
  return {
    update: (next: Partial<Props>) =>
      view.rerender(
        <MantineProvider>
          <NavigationProximity {...base} {...next} />
        </MantineProvider>,
      ),
  }
}

const shown = (name: string) => screen.queryByText(name) !== null

describe('nearby works through walls', () => {
  it('offers no work of another room when the estimate falls between rooms', () => {
    // 1.5 m from "east-work", but on the other side of the wall.
    renderProximity({ point: [10, 5] })

    expect(shown('East work')).toBe(false)
  })

  it('offers the work of the room the visitor is in', () => {
    renderProximity({ point: [11, 5] })

    expect(shown('East work')).toBe(true)
    expect(shown('West work')).toBe(false)
  })
})

describe('dismissing the notice', () => {
  it('keeps a dismissed work hidden when sensor jitter moves it briefly out of range', () => {
    const { update } = renderProximity({ point: [11, 5] })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Dismiss nearby works' })))
    expect(shown('East work')).toBe(false)

    update({ point: [17, 5] }) // one jittery fix: 5.5 m away, out of range
    update({ point: [11, 5] }) // back in front of it

    expect(shown('East work')).toBe(false)
  })

  it('shows it again once the visitor’s context changes', () => {
    const { update } = renderProximity({ point: [11, 5] })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Dismiss nearby works' })))

    update({ point: [11, 5], scopeKey: 'museum:other-at:device:' })

    expect(shown('East work')).toBe(true)
  })
})
