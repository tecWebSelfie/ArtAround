import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { PlanVisitDictationButton } from './PlanVisitDictationButton'

const meta = {
  title: 'Navigator/PlanVisit/DictationButton',
  component: PlanVisitDictationButton,
  args: {
    elapsedSeconds: 7,
    labels: {
      dictate: 'Dictate',
      idleText: 'Dictation',
      stop: 'Stop dictating',
      transcribing: 'Writing down your words…',
    },
    onToggle: fn(),
  },
} satisfies Meta<typeof PlanVisitDictationButton>

export default meta
type Story = StoryObj<typeof meta>

/** These state stories keep the compact idle/recording distinction reviewable. */
export const Ready: Story = {
  args: { state: 'idle' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Dictate' })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalledOnce()
  },
}

export const Recording: Story = {
  args: { state: 'recording' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Stop dictating' })
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByText('0:07')).toBeVisible()
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalledOnce()
  },
}

export const Transcribing: Story = {
  args: { state: 'transcribing' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Dictate' })).toBeDisabled()
  },
}
