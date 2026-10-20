import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, userEvent } from 'storybook/test'
import { JoinGroupForm } from './JoinGroupForm'

/** "Joining a group? Enter its code" on the navigator home and the tour start page. */
const meta = {
  title: 'Group/JoinGroupForm',
  component: JoinGroupForm,
  parameters: { nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof JoinGroupForm>

export default meta
type Story = StoryObj<typeof meta>

/** Join stays disabled until all six characters are in. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Join' })).toBeDisabled()
  },
}

/** A code typed in lower case is accepted and opens its join page. */
export const TypedCode: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getAllByRole('textbox', { name: 'Group code' })[0])
    await userEvent.keyboard('ab3x9k')
    const join = canvas.getByRole('button', { name: 'Join' })
    await expect(join).toBeEnabled()
    await userEvent.click(join)
    await expect(getRouter().push).toHaveBeenCalledWith('/en/room/AB3X9K')
  },
}
