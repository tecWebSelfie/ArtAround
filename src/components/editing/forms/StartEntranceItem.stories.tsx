import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Text, Timeline, TimelineItem } from '@mantine/core'
import { useState } from 'react'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { StartEntranceItem } from './StartEntranceItem'

/**
 * The tour editor's start entrance: the first, fixed item of the stops
 * timeline (a door instead of a number, no reorder or remove controls), above
 * a numbered stop as in `TourForm`.
 */
const meta = {
  title: 'Editing/StartEntranceItem',
  component: StartEntranceItem,
  args: {
    entrances: [
      { id: 'main', name: 'Main entrance' },
      { id: 'garden', name: 'Garden entrance' },
    ],
    value: '',
    onChange: fn(),
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Timeline bulletSize={28} lineWidth={2} active={1}>
        <StartEntranceItem
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next)
            args.onChange(next)
          }}
        />
        <TimelineItem bullet={<Text size="xs">1</Text>} title="The Rape of Proserpina" />
      </Timeline>
    )
  },
} satisfies Meta<typeof StartEntranceItem>

export default meta
type Story = StoryObj<typeof meta>

/** Several entrances: automatic by default, and the author can pick one. */
export const ChooseAmongEntrances: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: 'Start entrance' })
    await expect(input).toHaveValue('Nearest to the first stop')
    // Not a stop: nothing to drag, move or remove.
    await expect(canvas.queryByRole('button')).toBeNull()
    await userEvent.click(input)
    await userEvent.click(await screen.findByRole('option', { name: 'Garden entrance' }))
    await expect(args.onChange).toHaveBeenCalledWith('garden')
    await userEvent.click(input)
    await userEvent.click(await screen.findByRole('option', { name: 'Nearest to the first stop' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('')
  },
}

/** One entrance: nothing to choose, the item just names where the tour starts. */
export const SingleEntrance: Story = {
  args: { entrances: [{ id: 'main', name: null }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Start entrance')).toBeVisible()
    await expect(canvas.getByText('Entrance')).toBeVisible()
    await expect(canvas.queryByRole('combobox')).toBeNull()
  },
}
