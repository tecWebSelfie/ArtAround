import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within, userEvent, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '../../../.storybook/model-generation-providers'
import { modelGenerationHandlers } from '@/mocks/model-generation.mock'
import { ObjectCatalogPanel } from './ObjectCatalogPanel'
import { http, HttpResponse } from 'msw'
import { objectWithoutModel } from '@/mocks/model-generation.mock'

const meta = {
  title: 'Museum Map/Object Catalog',
  component: ObjectCatalogPanel,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div style={{ height: 700, width: 360 }}>
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
} satisfies Meta<typeof ObjectCatalogPanel>
export default meta
type Story = StoryObj<typeof meta>

export const NeedsModel: Story = {
  parameters: { msw: { handlers: modelGenerationHandlers() } },
  play: async ({ canvas }) => {
    await expect(canvas.findByText(/Needs a model/)).resolves.toBeVisible()
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Generate model for Attic amphora' }),
    )
    // The Mantine modal opens with a transition; in a loaded full run that
    // takes longer than waitFor's 1s default (over 5s during visual runs).
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible(), {
      timeout: 15_000,
    })
  },
}
export const Ready: Story = {
  parameters: { msw: { handlers: modelGenerationHandlers('ready') } },
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('img', { name: 'Attic amphora' })).resolves.toBeVisible()
  },
}
export const Empty: Story = {
  parameters: { msw: { handlers: modelGenerationHandlers('new', true) } },
  play: async ({ canvas }) => {
    await expect(
      canvas.findByText('No models ready to position. Create one above.'),
    ).resolves.toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Create a new object' })).toBeEnabled()
  },
}
export const Unavailable: Story = {
  parameters: { msw: { handlers: modelGenerationHandlers('new', false, true) } },
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('alert')).resolves.toHaveTextContent('Could not load objects.')
  },
}

export const Paginated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/objects', ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
          return HttpResponse.json({
            docs: [{ ...objectWithoutModel, name: page === 1 ? 'Attic amphora' : 'Roman bust' }],
            totalDocs: 25,
            totalPages: 2,
            page,
            limit: 24,
            hasNextPage: page === 1,
            hasPrevPage: page === 2,
          })
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Attic amphora')).resolves.toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
    await expect(canvas.findByText('Roman bust')).resolves.toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Previous' }))
    await expect(canvas.findByText('Attic amphora')).resolves.toBeVisible()
  },
}
