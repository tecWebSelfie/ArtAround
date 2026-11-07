import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { GuidanceSettings } from './GuidanceSettings'

// Permission is always initiated by a tap; denied and silent sensors explain the fallback.
const meta = {
  title: 'Tour Navigation/Compass Settings',
  component: GuidanceSettings,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="p-8">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  args: {
    settings: {
      assistant: false,
      setAssistant: fn(),
      voiceGuidance: false,
      setVoiceGuidance: fn(),
      suggestions: true,
      setSuggestions: fn(),
      gpsMode: 'device',
      setGpsMode: fn(),
    },
    gpsError: null,
    compass: { heading: null, status: 'off', enable: fn(async () => {}), turn: fn() },
  },
} satisfies Meta<typeof GuidanceSettings>
export default meta
type Story = StoryObj<typeof meta>

export const EnableFromTap: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    await expect(args.compass!.enable).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Guidance settings' }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('button', { name: 'Enable compass' }))
    await expect(args.compass!.enable).toHaveBeenCalledOnce()
  },
}
export const Denied: Story = {
  args: { compass: { ...meta.args.compass, status: 'denied' } },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Guidance settings' }))
    await expect(
      within(canvasElement.ownerDocument.body).getByText(
        'Compass permission denied. Allow it in browser settings or choose a nearby work.',
      ),
    ).toBeVisible()
  },
}
export const WaitingForSensor: Story = {
  args: { compass: { ...meta.args.compass, status: 'waiting' } },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Guidance settings' }))
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Enable compass' }),
    ).toBeDisabled()
  },
}
