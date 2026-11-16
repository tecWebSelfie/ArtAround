import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, userEvent } from 'storybook/test'
import { JoinGroupForm } from './JoinGroupForm'

/** "Joining a group?" on the navigator home, the tour start page and the room page. */
const meta = {
  title: 'Group/JoinGroupForm',
  component: JoinGroupForm,
  parameters: { nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof JoinGroupForm>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Join is disabled until the code fits: the hint under the field says where
 * the code comes from, then the length rule once a too-short text is typed.
 */
export const Empty: Story = {
  play: async ({ canvas }) => {
    const join = canvas.getByRole('button', { name: 'Join' })
    await expect(join).toBeDisabled()
    // The visible question labels the field, and the hint says who gives it.
    const field = canvas.getByRole('textbox', { name: /joining a group\?/i })
    await expect(field).toHaveAccessibleDescription(/whoever leads the group gives it to you/i)
    await expect(getRouter().push).not.toHaveBeenCalled()

    // Text that doesn't fit yet: the hint states the length rule.
    await userEvent.type(field, 'ab')
    await expect(join).toBeDisabled()
    await expect(field).toHaveAccessibleDescription(/3 to 30 letters or numbers/)
  },
}

/** A code typed in lower case enables Join, which opens its join page. */
export const TypedCode: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getAllByRole('textbox', { name: /joining a group\?/i })[0])
    await userEvent.keyboard('ab3x9k')
    const join = canvas.getByRole('button', { name: 'Join' })
    await expect(join).toBeEnabled()
    await userEvent.click(join)
    await expect(getRouter().push).toHaveBeenCalledWith('/en/room/AB3X9K')
  },
}
