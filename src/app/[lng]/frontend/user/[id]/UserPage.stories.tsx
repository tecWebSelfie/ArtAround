import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect } from 'storybook/test'

import type { User } from '@/payload-types'
import { mockUserFull, mockUserMinimal, mockUserNoEmail } from '@/mocks/user.mock'

import { UserPage } from './UserPage'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// UserPage.tsx itself stays an async Server Component for the App Router.
// Flat User args keep one control per field in the addon panel.
// The wrapper maps them back to the component's { user } props,
// so UserPage.tsx itself stays a correct App Router Server Component.
function UserPageForStorybook(props: User) {
  return use(UserPage({ user: props }))
}

const meta = {
  title: 'Frontend/User/UserPage',
  component: UserPageForStorybook,
  render: (args) => (
    <Suspense fallback={null}>
      <UserPageForStorybook {...args} />
    </Suspense>
  ),
  tags: ['autodocs'],
} satisfies Meta<typeof UserPageForStorybook>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { ...mockUserMinimal },
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('heading', { name: 'User Page' })).resolves.toBeTruthy()
  },
}

export const Full: Story = {
  args: { ...mockUserFull },
}

export const NoEmail: Story = {
  args: { ...mockUserNoEmail },
}
