import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { ReadingProfile } from './ReadingProfile'

/** A family member chooses an age without changing the shared itinerary. */
const meta = {
  title: 'Group/ReadingProfile',
  component: ReadingProfile,
  args: { ages: [5, 8], value: 'adult', onChange: fn() },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="max-w-sm p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  render: function Profile(args) {
    const [value, setValue] = useState(args.value)
    return (
      <ReadingProfile
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next)
          args.onChange(next)
        }}
      />
    )
  },
} satisfies Meta<typeof ReadingProfile>
export default meta
type Story = StoryObj<typeof meta>

export const ChooseReader: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Reading for' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Child aged 5' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('5')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Reading for' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Child aged 8' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('8')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Reading for' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Adult' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('adult')
  },
}
export const WithoutChildren: Story = {
  args: { ages: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument()
  },
}
