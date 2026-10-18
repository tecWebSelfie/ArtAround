import { mockMuseumFull } from '@/mocks/museum.mock'
import { mockTourFull } from '@/mocks/tour.mock'
import { AppShell } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TourNavigationPage } from './TourNavigation'
import { expect, userEvent, waitFor } from 'storybook/test'
import { useViewer } from '@pascal-app/viewer'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'

const meta = {
  title: 'Frontend/Navigator/TourNavigation',
  component: TourNavigationPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [(Story) => <ModelGenerationProviders><Story /></ModelGenerationProviders>],
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
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Explore in first person' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Return to map' })).not.toBeInTheDocument()
    await expect(useViewer.getState().walkthroughMode).toBe(false)
  },
}

export const OptionalFirstPerson: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Explore in first person' }))
    await expect(canvas.getByRole('button', { name: 'Return to map' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Return to map' }))
    await expect(canvas.getByRole('button', { name: 'Explore in first person' })).toBeVisible()
    await waitFor(() => expect(useViewer.getState().walkthroughMode).toBe(false))
  },
}

export const NoMap: Story = {
  args: { ...Default.args, museum: { ...mockMuseumFull, map: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Explore in first person' })).toBeDisabled()
    await expect(canvas.getByText('Map not available')).toBeVisible()
  },
}

export const Completed: Story = {
  args: { ...Default.args, step: mockTourFull.contents.length },
  play: async ({ canvas }) => { await expect(canvas.getByText('Tour completed')).toBeVisible() },
}
