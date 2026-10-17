import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { mockMuseumFull } from '@/mocks/museum.mock'
import { modelGenerationHandlers } from '@/mocks/model-generation.mock'
import { ModelGenerationProviders } from '../../../../../../../../.storybook/model-generation-providers'
import { MapEditor } from './MapEditor'

const meta = {
  title: 'Pages/Museum/Edit/Map',
  component: MapEditor,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  parameters: {
    msw: {
      handlers: [
        ...modelGenerationHandlers('ready'),
        http.get('*/api/museums/:id', () => HttpResponse.json(mockMuseumFull)),
        http.patch('*/api/museums/:id', () => HttpResponse.json(mockMuseumFull)),
      ],
    },
  },
} satisfies Meta<typeof MapEditor>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { museumId: mockMuseumFull.id },
  play: async ({ canvas }) => {
    const button = await canvas.findByRole(
      'button',
      { name: 'Add object to the map' },
      { timeout: 30000 },
    )
    await userEvent.click(button)
    await expect(canvas.findByRole('region', { name: 'Object catalog' })).resolves.toBeVisible()
  },
}
