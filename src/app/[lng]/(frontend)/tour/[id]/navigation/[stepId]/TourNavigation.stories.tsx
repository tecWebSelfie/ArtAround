import { mockMuseumFull } from '@/mocks/museum.mock'
import { mockTourFull } from '@/mocks/tour.mock'
import { createRouteMuseum, routeCatalog } from '@/mocks/tour-navigation.mock'
import { AppShell } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { TourNavigationPage } from './TourNavigation'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'

const meta = {
  title: 'Frontend/Navigator/TourNavigation',
  component: TourNavigationPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
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

export const Default: Story = {
  args: {
    tour: { ...mockTourFull, museum: { ...mockTourFull.museum, docs: [mockMuseumFull] } },
    step: 0,
    museum: mockMuseumFull,
    catalog: [],
  },
}

export const RouteBetweenObjects: Story = {
  args: {
    ...Default.args,
    museum: createRouteMuseum(new URL('/models/exhibit.glb', window.location.origin).href),
    catalog: routeCatalog,
  },
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          ['id', mockTourFull.id],
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
          ['id', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start', to: 'route-end', mobility: 'wheelchair' },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Wheelchair route' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

export const WheelchairRouteWithoutWheelchairMesh: Story = {
  ...RouteBetweenObjects,
  args: {
    ...RouteBetweenObjects.args,
    museum: {
      ...createRouteMuseum(new URL('/models/exhibit.glb', window.location.origin).href),
      navMeshWheelchair: null,
    },
  },
  parameters: {
    nextjs: {
      navigation: {
        segments: [
          ['lng', 'en'],
          ['id', mockTourFull.id],
          ['stepId', '0'],
        ],
        query: { at: 'route-start', to: 'route-end', mobility: 'wheelchair' },
      },
    },
  },
  play: async ({ canvas }) => {
    const accessibilityToggle = canvas.getByRole('button', { name: 'Wheelchair route' })
    await expect(accessibilityToggle).toBeDisabled()
    await expect(accessibilityToggle).toHaveAttribute('aria-pressed', 'false')
  },
}

export const NoMap: Story = {
  args: { ...Default.args, museum: { ...mockMuseumFull, map: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Map not available')).toBeVisible()
  },
}

export const Completed: Story = {
  args: { ...Default.args, step: mockTourFull.contents.length },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Tour completed')).toBeVisible()
  },
}
