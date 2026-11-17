import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { expect, fn, userEvent } from 'storybook/test'
import { AssistantButton } from './AssistantButton'

// A steady mid-level voice, so listening/speaking stories show the reaction.
const voice = { current: 0.6 }

const meta = {
  title: 'Assistant/Button',
  component: AssistantButton,
  // Supplies the i18next instance (interpolated English fallbacks).
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  args: {
    state: 'off',
    label: 'Turn on the voice assistant',
    status: 'Voice assistant off',
    onPress: fn(),
  },
  parameters: {
    // The listening rings and the voice halo loop forever.
    visual: { disable: true },
    layout: 'centered',
  },
} satisfies Meta<typeof AssistantButton>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Turn on the voice assistant' })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    await expect(args.onPress).toHaveBeenCalled()
  },
}

/** Opted in, mic closed: a filled mic button, no rings. */
export const Ready: Story = {
  args: {
    state: 'ready',
    label: 'Talk to the assistant',
    status: 'Voice assistant ready, microphone off',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('microphone off')
  },
}

/** The only state with the mic open: rings leave the edge; `aria-pressed` says so too. */
export const Listening: Story = {
  args: { state: 'listening', label: 'Stop listening', status: 'Listening', level: voice },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Stop listening' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

/** It heard the visitor and is answering: the button's loader, no rings. */
export const Thinking: Story = {
  args: { state: 'thinking', label: 'Assistant is thinking', status: 'Thinking' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Assistant is thinking' })).toHaveAttribute(
      'data-loading',
    )
  },
}

export const Speaking: Story = {
  args: { state: 'speaking', label: 'Stop speaking', status: 'Speaking', level: voice },
}
