import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { expect, fn, userEvent } from 'storybook/test'
import { AssistantOrb } from './AssistantOrb'

// A steady mid-level voice, so listening/speaking stories show the reaction.
const voice = { current: 0.6 }

const meta = {
  title: 'Assistant/Orb',
  component: AssistantOrb,
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
    size: 96,
  },
  parameters: {
    // The ball is a live WebGL particle animation (React Bits CrystalizedBall).
    visual: { disable: true },
  },
} satisfies Meta<typeof AssistantOrb>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {
  play: async ({ canvas, args }) => {
    const orb = canvas.getByRole('button', { name: 'Turn on the voice assistant' })
    await expect(orb).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(orb)
    await expect(args.onPress).toHaveBeenCalled()
  },
}

/** Opted in, mic closed: a slow breathe only. */
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

/** The only state with the mic open; `aria-pressed` says so too. */
export const Listening: Story = {
  args: { state: 'listening', label: 'Stop listening', status: 'Listening', level: voice },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Stop listening' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

export const Thinking: Story = {
  args: { state: 'thinking', label: 'Assistant is thinking', status: 'Thinking' },
}

export const Speaking: Story = {
  args: { state: 'speaking', label: 'Stop speaking', status: 'Speaking', level: voice },
}
