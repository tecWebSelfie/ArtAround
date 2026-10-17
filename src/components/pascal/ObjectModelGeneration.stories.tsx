import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '../../../.storybook/model-generation-providers'
import {
  modelGenerationHandlers,
  objectWithoutModel,
  objectWithModel,
} from '@/mocks/model-generation.mock'
import { ObjectModelGeneration } from './ObjectModelGeneration'

const meta = {
  title: 'Museum Map/Object Generation',
  component: ObjectModelGeneration,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div style={{ maxWidth: 640, padding: 24 }}>
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  args: { onPosition: fn() },
} satisfies Meta<typeof ObjectModelGeneration>
export default meta
type Story = StoryObj<typeof meta>

export const NewObject: Story = {
  parameters: { msw: { handlers: modelGenerationHandlers() } },
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: /Object title/ }), 'Attic amphora')
    await userEvent.type(
      canvas.getByRole('textbox', { name: /Describe the object/ }),
      'A terracotta amphora with two handles.',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Generate preview' }))
    await expect(
      canvas.findByRole('img', { name: 'Generated object preview' }),
    ).resolves.toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Approve and create model' }))
    const position = await canvas.findByRole('button', { name: 'Position' })
    await userEvent.click(position)
    await expect(args.onPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'catalog-object',
        src: expect.stringMatching(/\/models\/exhibit\.glb$/),
      }),
    )
  },
}
export const Preview: Story = {
  args: { object: objectWithoutModel },
  parameters: { msw: { handlers: modelGenerationHandlers('preview') } },
  play: async ({ canvas }) => {
    await expect(
      canvas.findByRole('img', { name: 'Generated object preview' }),
    ).resolves.toBeVisible()
    const revise = canvas.getByRole('button', { name: 'Revise preview' })
    await expect(revise).toBeDisabled()
    await userEvent.type(
      canvas.getByLabelText('What would you like to change?'),
      'Make the handles smaller.',
    )
    await expect(revise).toBeEnabled()
    await userEvent.click(revise)
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Approve and create model' })).toBeEnabled(),
    )
  },
}
export const Finalizing: Story = {
  args: { object: objectWithoutModel },
  parameters: { msw: { handlers: modelGenerationHandlers('finalizing') } },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Creating and saving your model…')).resolves.toBeVisible()
    await expect(
      canvas.queryByRole('button', { name: 'Approve and create model' }),
    ).not.toBeInTheDocument()
  },
}
export const Failed: Story = {
  args: { object: objectWithoutModel },
  parameters: { msw: { handlers: modelGenerationHandlers('failed') } },
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('alert')).resolves.toHaveTextContent(
      'Mint could not prepare this preview.',
    )
  },
}
export const SavedModel: Story = {
  args: { object: objectWithModel },
  parameters: { msw: { handlers: modelGenerationHandlers('ready') } },
  play: async ({ canvas, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Position' }))
    await expect(args.onPosition).toHaveBeenCalled()
  },
}
