import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { DoorOpen, Accessibility } from 'lucide-react'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { NavigationServices } from './NavigationServices'

// Exercise disclosure, action selection and keyboard recovery, not menu internals.
const meta = {
  title: 'Tour Navigation/Services',
  component: NavigationServices,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  args: {
    actions: [
      {
        id: 'exit',
        label: 'Nearest exit',
        Icon: DoorOpen,
        color: 'red',
        active: false,
        onSelect: fn(),
      },
      {
        id: 'wheelchair',
        label: 'Wheelchair route',
        Icon: Accessibility,
        color: 'blue',
        active: true,
        onSelect: fn(),
      },
    ],
  },
} satisfies Meta<typeof NavigationServices>
export default meta
type Story = StoryObj<typeof meta>

export const ChooseService: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    const trigger = canvas.getByRole('button', { name: /^Services$/ })
    await userEvent.click(trigger)
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('button', { name: 'Wheelchair route' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(body.getByRole('button', { name: 'Nearest exit' }))
    await expect(args.actions[0]!.onSelect).toHaveBeenCalledOnce()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  },
}
export const CloseWithEscape: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: /^Services$/ })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveFocus()
  },
}
export const NoServices: Story = {
  args: { actions: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
  },
}
