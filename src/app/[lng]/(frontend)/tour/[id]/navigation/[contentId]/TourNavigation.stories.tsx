import { mockMuseumFull } from '@/mocks/museum.mock'
import { mockTourFull } from '@/mocks/tour.mock'
import { AppShell } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TourNavigation } from './TourNavigation'

const meta = {
  title: 'Frontend/Navigator/TourNavigation',
  component: TourNavigation,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <AppShell>
      <TourNavigation {...args} className="h-dvh" />
    </AppShell>
  ),
} satisfies Meta<typeof TourNavigation>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    tour: { ...mockTourFull, museum: { ...mockTourFull.museum, docs: [mockMuseumFull] } },
    step: 0,
  },
}
