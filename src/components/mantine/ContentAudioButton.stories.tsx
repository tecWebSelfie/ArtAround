import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { expect, userEvent, waitFor } from 'storybook/test'
import { useState } from 'react'
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

/** Switching the reader replaces a still-preparing recording rather than reusing its player. */
export const SwitchReaderWhilePreparing: Story = {
  render: (args) => {
    const [age, setAge] = useState(5)
    return (
      <>
        <button type="button" onClick={() => setAge(8)}>
          Read for age eight
        </button>
        <ContentAudioButton
          {...args}
          version={{ kind: 'version', difficulty: 'easy', seconds: 60, audience: 'children', age }}
        />
      </>
    )
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/content-audio/:id', ({ request }) => {
          const { age } = JSON.parse(new URL(request.url).searchParams.get('version')!)
          return HttpResponse.json(
            { status: age === 5 ? 'pending' : 'unavailable' },
            { status: age === 5 ? 202 : 503 },
          )
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Listen$/ }))
    await expect(await canvas.findByRole('button', { name: 'Preparing the audio' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Read for age eight' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: /^Listen$/ })).toBeEnabled())
    await userEvent.click(canvas.getByRole('button', { name: /^Listen$/ }))
    await expect(await canvas.findByRole('button', { name: 'Audio not available' })).toBeDisabled()
  },
}
