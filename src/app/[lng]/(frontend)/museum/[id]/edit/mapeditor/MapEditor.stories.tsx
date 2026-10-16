import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { mockMuseumFull } from '@/mocks/museum.mock'
import { MapEditor } from './MapEditor'

const meta = {
  title: 'Pages/Museum/Edit/Map',
  component: MapEditor,
} satisfies Meta<typeof MapEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    museum: mockMuseumFull,
  },
}
