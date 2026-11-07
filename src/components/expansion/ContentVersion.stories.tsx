import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { http, HttpResponse } from 'msw'
import { expect, waitFor, userEvent } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { mockContentSecond } from '@/mocks/content.mock'
import { ContentVersion } from './ContentVersion'

/** Even a two-second caption can request a valid exact-age version. */
const meta = {
  title: 'Tour navigation/Family content',
  component: ContentVersion,
  args: {
    content: { ...mockContentSecond, durationSeconds: 2 },
    children: <p>The original facts.</p>,
  },
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
        pathname: '/en/museum/m/navigation/tour/t/0/open',
        query: { audience: 'children', age: '5' },
      },
    },
  },
} satisfies Meta<typeof ContentVersion>
export default meta
type Story = StoryObj<typeof meta>
let asked: { request: { age?: number; seconds?: number } } | undefined
let audioVersion: unknown
export const ExactAgeCaption: Story = {
  beforeEach: () => {
    asked = undefined
    audioVersion = undefined
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/content-audio/:id', ({ request }) => {
          audioVersion = JSON.parse(new URL(request.url).searchParams.get('version') ?? 'null')
          return HttpResponse.json({ status: 'unavailable' }, { status: 503 })
        }),
        http.post('*/api/expand', async ({ request }) => {
          asked = (await request.json()) as typeof asked
          return new HttpResponse('The same facts for a five-year-old.', {
            headers: { 'Content-Type': 'text/plain' },
          })
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The same facts for a five-year-old.')).toBeVisible()
    await waitFor(() => expect(asked?.request).toMatchObject({ age: 5, seconds: 3 }))
    await userEvent.click(canvas.getByRole('button', { name: /^Listen$/ }))
    await expect(await canvas.findByRole('button', { name: 'Audio not available' })).toBeDisabled()
    await expect(audioVersion).toEqual(asked?.request)
    await userEvent.click(canvas.getByRole('button', { name: /^Original$/ }))
    const location = new URL(getRouter().replace.mock.calls.at(-1)![0], 'http://test')
    await expect(location.searchParams.has('age')).toBe(false)
    await expect(location.searchParams.has('audience')).toBe(false)
  },
}
