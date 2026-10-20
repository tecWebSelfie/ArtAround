import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ModelGenerationProviders } from '../../../.storybook/model-generation-providers'
import { UserPicker } from './UserPicker'

// The users endpoint answers like Payload's REST `find`, filtered by the
// search the picker sends (first name, last name or username contains).
const people = [
  { id: 'u1', username: 'chiara', name: { firstName: 'Chiara', lastName: 'Moretti' } },
  { id: 'u2', username: 'luca', name: { firstName: 'Luca', lastName: 'Ferrari' } },
]
const usersHandler = http.get('*/api/users', ({ request }) => {
  const query = decodeURIComponent(new URL(request.url).search).toLowerCase()
  const docs = people.filter((person) =>
    [person.username, person.name.firstName, person.name.lastName].some((part) =>
      query.includes(`[contains]=${part.slice(0, 3).toLowerCase()}`),
    ),
  )
  return HttpResponse.json({ docs, totalDocs: docs.length, page: 1, totalPages: 1, limit: 10 })
})

const meta = {
  title: 'Editing/User Picker',
  component: UserPicker,
  args: { label: 'Person', value: null, onChange: fn() },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div style={{ width: 320 }}>
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  parameters: { msw: { handlers: [usersHandler] } },
  // Controlled like the members form: the picked username becomes the value.
  render: function Render(args) {
    const [value, setValue] = useState<string | null>(args.value)
    return (
      <UserPicker
        {...args}
        value={value}
        onChange={(username) => {
          setValue(username)
          args.onChange(username)
        }}
      />
    )
  },
} satisfies Meta<typeof UserPicker>
export default meta
type Story = StoryObj<typeof meta>

export const SearchByName: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: 'Person' })
    await userEvent.type(input, 'chi')
    // Rendered in a portal, outside the canvas.
    const option = await within(document.body).findByRole('option', {
      name: 'Chiara Moretti (@chiara)',
    })
    await userEvent.click(option)
    await expect(args.onChange).toHaveBeenCalledWith('chiara')
  },
}
