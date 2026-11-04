import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { expect, userEvent } from 'storybook/test'
import { ContentAudioButton } from './ContentAudioButton'

/**
 * "Listen" next to a content's text (`/api/content-audio/[id]`). The route
 * is mocked: these stories only check what the button shows while the audio
 * is unavailable, never play real speech.
 */
const meta = {
  title: 'Mantine/ContentAudioButton',
  component: ContentAudioButton,
  args: { contentId: 'content-1' },
} satisfies Meta<typeof ContentAudioButton>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('button', { name: 'Listen' })).resolves.toBeTruthy()
  },
}

/** No speech API key on the server: the button says so and turns off. */
export const Unavailable: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/content-audio/:id', () =>
          HttpResponse.json({ status: 'unavailable' }, { status: 503 }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Listen' }))
    const button = await canvas.findByRole('button', { name: 'Audio not available' })
    await expect(button).toBeDisabled()
  },
}
