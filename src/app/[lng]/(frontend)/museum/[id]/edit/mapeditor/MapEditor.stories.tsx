import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MapEditor } from './MapEditor'

const meta = {
  title: 'Pages/Museum/Edit/Map',
  component: MapEditor,
} satisfies Meta<typeof MapEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
