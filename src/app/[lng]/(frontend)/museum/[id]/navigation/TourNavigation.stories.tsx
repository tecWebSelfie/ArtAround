import { mockMuseumFull } from '@/mocks/museum.mock'
import { mockContentsList } from '@/mocks/content.mock'
import { mockTourFull } from '@/mocks/tour.mock'
import { createRouteMuseum, routeCatalog } from '@/mocks/tour-navigation.mock'
import { visitableTour } from '@/lib/tour-navigation'
import { AppShell } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Notifications } from '@mantine/notifications'
import { TourNavigationPage } from './TourNavigation'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'

const meta = {
  title: 'Frontend/Navigator/TourNavigation',
  component: TourNavigationPage,
  parameters: {
    layout: 'fullscreen',
    // The live WebGL map never renders two identical frames in a row.
    visual: { disable: true },
  },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        {/* Nearby suggestions and assistant replies are notifications. */}
        <Notifications />
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  render: (args) => (
    <AppShell header={{ height: 'auto', offset: false }} footer={{ height: 64, offset: true }}>
      <TourNavigationPage {...args} />
    </AppShell>
  ),
} satisfies Meta<typeof TourNavigationPage>

export default meta

type Story = StoryObj<typeof meta>

// Root-relative on purpose: Pascal's asset schema only accepts `/path`, https
// or http://localhost, so an absolute URL built from `window.location.origin`
// fails at module load when Storybook is served from another host (e.g. Loki's
// Docker Chrome reaching it via host.docker.internal) and breaks every story.
const ROUTE_MODEL_URL = '/models/exitEntrance.glb'

// The tour's stops are about the route museum's two placed objects (the
// catalog lists them, as `objects.contents` does), so every stop is visitable.
// Stops alternate between the two objects, starting from the gallery one.
const visitableRouteCatalog = routeCatalog.map((object, objectIndex) => ({
  ...object,
  contents: [
    ...object.contents,
    ...mockContentsList
      .filter((_, stop) => stop % 2 !== objectIndex)
      .map(({ id, title }) => ({ id, title })),
  ],
}))

export const Default: Story = {
  args: {
    scope: { kind: 'tour', tour: { ...mockTourFull, museum: mockMuseumFull }, step: 0 },
    // A map where the tour's works are placed: every stop can be visited.
    museum: createRouteMuseum(ROUTE_MODEL_URL),
    catalog: visitableRouteCatalog,
  },
}

export const RouteBetweenObjects: Story = {
  args: Default.args,
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          // Museum-owned tour URL: `/museum/[id]/navigation/tour/[tourId]/[stepId]`.
          ['id', mockMuseumFull.id],
          ['tourId', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start', to: 'route-end' },
      },
    },
  },
}

export const WheelchairRoute: Story = {
  ...RouteBetweenObjects,
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          // Museum-owned tour URL: `/museum/[id]/navigation/tour/[tourId]/[stepId]`.
          ['id', mockMuseumFull.id],
          ['tourId', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start', to: 'route-end', mobility: 'wheelchair' },
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    // Accessibility shares the services panel so the map dock remains reachable.
    await userEvent.click(canvas.getByRole('button', { name: 'Services' }))
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Wheelchair route' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const WheelchairRouteWithoutWheelchairMesh: Story = {
  ...RouteBetweenObjects,
  args: {
    ...RouteBetweenObjects.args,
    museum: {
      ...createRouteMuseum(ROUTE_MODEL_URL),
      navMeshWheelchair: undefined,
    },
  },
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          // Museum-owned tour URL: `/museum/[id]/navigation/tour/[tourId]/[stepId]`.
          ['id', mockMuseumFull.id],
          ['tourId', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start', to: 'route-end', mobility: 'wheelchair' },
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    // Without a wheelchair mesh the toggle is not offered at all (rather than
    // shown disabled), and a shared `mobility=wheelchair` URL falls back to
    // the standard route.
    await expect(canvas.findByRole('button', { name: 'Search' })).resolves.toBeTruthy()
    await userEvent.click(canvas.getByRole('button', { name: 'Services' }))
    await expect(
      within(canvasElement.ownerDocument.body).queryByRole('button', { name: 'Wheelchair route' }),
    ).toBeNull()
  },
}

/** Directions built from the route and the map's rooms, in the navbar. */
export const RouteDirections: Story = {
  ...RouteBetweenObjects,
  // Needs a computed route, and the headless test browser never finishes
  // loading the WebGPU map: preview it in Storybook. The logic is unit-tested
  // in tests/int/tour-guidance.int.spec.ts.
  tags: ['!test'],
  play: async ({ canvas }) => {
    await expect(
      canvas.findByText('Start in West hall', {}, { timeout: 45_000 }),
    ).resolves.toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }))
    await expect(canvas.getByText(/into East hall/)).toBeVisible()
  },
}

/**
 * Opted in to suggestions: the confirmed position is in the West hall, so its
 * object's off-tour content is suggested once, with Open / Go there.
 */
export const NearbySuggestion: Story = {
  ...RouteBetweenObjects,
  // Needs a computed route, and the headless test browser never finishes
  // loading the WebGPU map: preview it in Storybook. The logic is unit-tested
  // in tests/int/tour-guidance.int.spec.ts.
  tags: ['!test'],
  beforeEach: () => {
    localStorage.setItem('aa-nearby-suggestions', 'true')
    return () => localStorage.removeItem('aa-nearby-suggestions')
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(
      body.findByText('Nearby in West hall', {}, { timeout: 45_000 }),
    ).resolves.toBeVisible()
    await expect(body.getByText('How the hall was built')).toBeVisible()
    await expect(body.getByRole('button', { name: 'Go there' })).toBeVisible()
  },
}

/**
 * Simulated GPS with suggestions on: the D-pad moves the progress dot along
 * the route, advancing the step. Each arrow also turns the simulated compass;
 * facing a nearby work shows a live next-stop/discovery notice. Room history
 * remains available in search without stacking a second notification.
 */
export const SimulatedGps: Story = {
  ...RouteBetweenObjects,
  tags: ['!test'],
  beforeEach: () => {
    localStorage.setItem('aa-gps', '"simulated"')
    localStorage.setItem('aa-nearby-suggestions', 'true')
    return () => {
      localStorage.removeItem('aa-gps')
      localStorage.removeItem('aa-nearby-suggestions')
    }
  },
}

/** The dormant orb sits at the right of the navbar until the visitor opts in. */
export const AssistantOff: Story = {
  ...RouteBetweenObjects,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Turn on the voice assistant' })).toBeVisible()
    // "Open next stop" moved from the navbar to the map overlay.
    await expect(canvas.getByRole('button', { name: 'Open next stop' })).toBeVisible()
  },
}

export const NoMap: Story = {
  args: { ...Default.args, museum: { ...mockMuseumFull, map: null } },
  // No map, so the navigation chrome can be screenshotted.
  parameters: { visual: { disable: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Map not available')).toBeVisible()
  },
}

export const Completed: Story = {
  args: {
    ...Default.args,
    scope: {
      kind: 'tour',
      tour: { ...mockTourFull, museum: mockMuseumFull },
      step: mockTourFull.contents.length,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Tour completed')).toBeVisible()
  },
}

/**
 * Free navigation (`/museum/[id]/navigation`): the header names the museum,
 * there is no tour progress or default destination, and the empty Spotlight
 * leads with the museum's tours.
 */
export const FreeNavigation: Story = {
  args: {
    scope: { kind: 'free', museumId: mockMuseumFull.id },
    museum: { ...mockMuseumFull, map: null },
    catalog: [],
    tours: [
      { id: mockTourFull.id, title: mockTourFull.title, stops: mockTourFull.contents.length },
    ],
  },
  parameters: {
    visual: { disable: false },
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          ['id', mockMuseumFull.id],
        ],
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Free visit')).toBeVisible()
    await expect(canvas.queryByLabelText('Tour progress')).toBeNull()
    // Directions ask for a start before an end: with no position yet, the bar
    // asks for it first (DirectionsBar's "no-position" state).
    await expect(canvas.getByText('Where are you? Find the work in front of you')).toBeVisible()
  },
}

/**
 * A tour with a stop whose work is no longer on the map (the second one):
 * navigation drops it before the visitor sees anything (`visitableTour`), so
 * the header counts the two visitable stops, the stepper never lists the
 * missing one, and there is no "Skipped" badge or blocking modal.
 */
const stopCatalog = routeCatalog.map((object, index) => ({
  ...object,
  // The first and third stops are listed on the map's objects; the second is not.
  contents: [
    ...object.contents,
    { id: mockContentsList[index * 2]!.id, title: mockContentsList[index * 2]!.title },
  ],
}))
const visitableStopsTour = visitableTour(
  { ...mockTourFull, museum: mockMuseumFull },
  stopCatalog,
  new Set(routeCatalog.map(({ id }) => id)),
)

export const UnavailableStop: Story = {
  ...RouteBetweenObjects,
  args: {
    ...RouteBetweenObjects.args,
    scope: { kind: 'tour', tour: visitableStopsTour, step: 0 },
    catalog: stopCatalog,
  },
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          // Museum-owned tour URL: `/museum/[id]/navigation/tour/[tourId]/[stepId]`.
          ['id', mockMuseumFull.id],
          ['tourId', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start' },
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(canvas.getByText(/Stop 1 of 2/)).toBeVisible()
    await expect(canvas.getByText(mockContentsList[0]!.title)).toBeVisible()
    await expect(canvas.getByText(mockContentsList[2]!.title)).toBeVisible()
    await expect(canvas.queryByText(mockContentsList[1]!.title)).toBeNull()
    await expect(canvas.queryByText('Skipped')).toBeNull()
    await expect(body.queryByRole('dialog')).toBeNull()
  },
}
