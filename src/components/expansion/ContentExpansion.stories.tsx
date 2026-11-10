import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { expect } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { ContentExpansion } from './ContentExpansion'

/** Follow-up explanations retain this reader's age without changing the stop. */
const meta = {
  title: 'Tour navigation/Family explanations',
  component: ContentExpansion,
  args: { target: 'contents', id: 'c' },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  parameters: {
    nextjs: {
      navigation: {
        segments: [['lng', 'en']],
        query: { audience: 'children', age: '8', more: 'curiosities' },
      },
    },
  },
} satisfies Meta<typeof ContentExpansion>
export default meta
type Story = StoryObj<typeof meta>
let age: number | undefined
export const KeepsReaderAge: Story = {
  beforeEach: () => {
    age = undefined
  },
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/expand', async ({ request }) => {
          age = ((await request.json()) as { request: { age?: number } }).request.age
          return new HttpResponse('A curiosity for an eight-year-old.', {
            headers: { 'Content-Type': 'text/plain' },
          })
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('A curiosity for an eight-year-old.')).toBeVisible()
    await expect(age).toBe(8)
  },
}
