import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { GroupNameForm } from './GroupNameForm'

/** The one field a group needs, validated with the same schema as `/api/rooms`. */
const meta = {
  title: 'Group/GroupNameForm',
  component: GroupNameForm,
  args: { submitLabel: 'Join the group', onSubmit: fn() },
  beforeEach: () => {
    // Every story starts without a remembered name.
    window.localStorage.removeItem('aa-name')
  },
} satisfies Meta<typeof GroupNameForm>

export default meta
type Story = StoryObj<typeof meta>

/** The name is trimmed and handed over. */
export const Submitted: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Your name' }), '  Marco ')
    await userEvent.click(canvas.getByRole('button', { name: 'Join the group' }))
    await expect(args.onSubmit).toHaveBeenCalledWith('Marco')
  },
}

/** An empty name shows the error instead of submitting. */
export const EmptyName: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Join the group' }))
    await expect(canvas.getByText('Enter a name of up to 30 characters')).toBeVisible()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

/** A server problem appears above the button. */
export const WithError: Story = {
  args: { error: 'The group could not be opened. Try again in a minute.' },
}
