import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { expect, userEvent } from 'storybook/test'
import { JoinGroupForm } from './JoinGroupForm'

// Storybook has no global i18next instance, and without one `t` returns the
// key as is, `{{min}}` included. Keys are the English text, so an empty
// instance is enough to interpolate the length rule's limits.
const i18n = createInstance()
void i18n.init({ lng: 'en', ns: ['group'], resources: { en: { group: {} } }, initAsync: false })

/** "Joining a group?" on the navigator home, the tour start page and the room page. */
const meta = {
  title: 'Group/JoinGroupForm',
  component: JoinGroupForm,
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
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
