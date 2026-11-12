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
 * Join is light while the field is empty but never disabled: pressed too
 * early, the field shows the length rule as its error in place of the hint,
 * and typing again clears it.
 */
export const Empty: Story = {
  play: async ({ canvas }) => {
    const join = canvas.getByRole('button', { name: 'Join' })
    await expect(join).toBeEnabled()
    await expect(join).toHaveAttribute('data-variant', 'light')
    // The visible question labels the field, and the hint says who gives it.
    const field = canvas.getByRole('textbox', { name: /joining a group\?/i })
    await expect(field).toHaveAccessibleDescription(/whoever leads the group gives it to you/i)

    await userEvent.click(join)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription(/3 to 30 letters or numbers/)
    await expect(getRouter().push).not.toHaveBeenCalled()

    await userEvent.type(field, 'a')
    await expect(field).not.toHaveAttribute('aria-invalid', 'true')
  },
}

/** A code typed in lower case turns Join filled and opens its join page. */
export const TypedCode: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getAllByRole('textbox', { name: /joining a group\?/i })[0])
    await userEvent.keyboard('ab3x9k')
    const join = canvas.getByRole('button', { name: 'Join' })
    await expect(join).toHaveAttribute('data-variant', 'filled')
    await userEvent.click(join)
    await expect(getRouter().push).toHaveBeenCalledWith('/en/room/AB3X9K')
  },
}
