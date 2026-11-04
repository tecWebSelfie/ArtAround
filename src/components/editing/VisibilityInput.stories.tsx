import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { VisibilityInput } from './VisibilityInput'

/** Public or private, in the content and tour forms (`src/lib/visibility.ts`). */
const meta = {
  title: 'Editing/VisibilityInput',
  component: VisibilityInput,
  args: { kind: 'content', value: 'public', onChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <VisibilityInput {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof VisibilityInput>

export default meta
type Story = StoryObj<typeof meta>

/** Choosing "Private" says who will still be able to read it. */
export const ContentGoesPrivate: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.findByText(/Everyone can find it/)).resolves.toBeTruthy()
    await userEvent.click(await canvas.findByText('Private'))
    await expect(
      canvas.findByText(/Only you and the guests of your group visits can read this content/),
    ).resolves.toBeTruthy()
  },
}
