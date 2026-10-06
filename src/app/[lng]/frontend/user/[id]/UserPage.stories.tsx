import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect, waitFor } from 'storybook/test'

import { mockContentMinimal, mockContentSecond, mockContentThird } from '@/mocks/content.mock'
import { mockMuseumBrera, mockMuseumMinimal, mockMuseumUffizi } from '@/mocks/museum.mock'
import type { Museum, User } from '@/payload-types'
import {
  mockUserAuthor,
  mockUserCurator,
  mockUserDirector,
  mockUserFull,
  mockUserInactiveRole,
  mockUserManyContents,
  mockUserMinimal,
  mockUserNoEmail,
  mockUserUnpopulatedRefs,
  mockUserVerifiedCreator,
} from '@/mocks/user.mock'

import { UserPage } from './UserPage'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// UserPage.tsx itself stays an async Server Component for the App Router.
// Flat User args keep one control per field in the addon panel, plus an extra
// `curatedMuseums` control for the curator-for-specific-museums states.
// The wrapper maps them back to the component's { user, curatedMuseums } props,
// so UserPage.tsx itself stays a correct App Router Server Component.
type UserPageStoryProps = User & { curatedMuseums?: (string | Museum)[] | null }

function UserPageForStorybook({ curatedMuseums, ...user }: UserPageStoryProps) {
  return use(UserPage({ user, curatedMuseums }))
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
    // The page title must show the user's derived full name.
    await expect(
      canvas.findByRole('heading', { name: mockUserMinimal.name.fullName }),
    ).resolves.toBeTruthy()
  },
}

export const Full: Story = {
  args: { ...mockUserFull },
  play: async ({ canvas }) => {
    // Avatar must carry the full name as its accessible name.
    await expect(
      canvas.findByRole('img', { name: mockUserFull.name.fullName }),
    ).resolves.toBeTruthy()
  },
}

export const NoEmail: Story = {
  args: { ...mockUserNoEmail },
}

export const VerifiedCreator: Story = {
  args: { ...mockUserVerifiedCreator },
  play: async ({ canvas }) => {
    // Active creator role: verified badge plus the authored content, no curator badge.
    await expect(canvas.findByText('Verified creator')).resolves.toBeTruthy()
    await expect(canvas.findByText(mockContentMinimal.title)).resolves.toBeTruthy()
    expect(canvas.queryByText('Curator')).toBeNull()
  },
}

export const AuthorVerifiedByContents: Story = {
  args: { ...mockUserAuthor },
  play: async ({ canvas }) => {
    // No roles at all: verified through authored contents alone.
    await expect(
      canvas.findByRole('img', { name: mockUserAuthor.name.fullName }),
    ).resolves.toBeTruthy()
    await expect(canvas.findByText('Verified creator')).resolves.toBeTruthy()
    await expect(canvas.findByText(mockContentSecond.title)).resolves.toBeTruthy()
    expect(canvas.queryByText('Curator')).toBeNull()
  },
}

export const CuratorWithMuseums: Story = {
  args: { ...mockUserCurator, curatedMuseums: [mockMuseumUffizi, mockMuseumBrera] },
  play: async ({ canvas }) => {
    // One curator badge per museum, plus the verified badge.
    await expect(canvas.findByText('Verified creator')).resolves.toBeTruthy()
    await expect(canvas.findByText(mockMuseumUffizi.name)).resolves.toBeTruthy()
    await expect(canvas.findByText(mockMuseumBrera.name)).resolves.toBeTruthy()
    // Per-museum badges replace the generic Curator badge: eventually the only
    // remaining 'Curator' text is the hidden info-tab Roles row (inactive tab
    // panels commit deferred, so poll until it settles).
    await waitFor(() => expect(canvas.getAllByText('Curator')).toHaveLength(1))
  },
}

export const DirectorWithMuseum: Story = {
  args: { ...mockUserDirector, curatedMuseums: [mockMuseumMinimal] },
  play: async ({ canvas }) => {
    // Directors hold curation rights just like curators.
    await expect(canvas.findByText(mockMuseumMinimal.name)).resolves.toBeTruthy()
  },
}

export const CuratorMuseumsUnpopulated: Story = {
  args: { ...mockUserCurator, curatedMuseums: ['museum-unknown'] },
  play: async ({ canvas }) => {
    // Unpopulated museum IDs fall back to the generic Curator badge: one visible
    // badge plus the hidden info-tab Roles row (inactive tab panels commit
    // deferred, so poll until both are present).
    await waitFor(() => expect(canvas.getAllByText('Curator')).toHaveLength(2))
  },
}

export const InactiveRole: Story = {
  args: { ...mockUserInactiveRole },
  play: async ({ canvas }) => {
    // Inactive roles grant nothing: no badges at all.
    await expect(
      canvas.findByRole('heading', { name: mockUserInactiveRole.name.fullName }),
    ).resolves.toBeTruthy()
    expect(canvas.queryByText('Verified creator')).toBeNull()
    expect(canvas.queryByText('Curator')).toBeNull()
  },
}

export const UnpopulatedReferences: Story = {
  args: { ...mockUserUnpopulatedRefs },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: empty state instead of a crash.
    await expect(
      canvas.findByText('No contents authored yet', undefined, { timeout: 5000 }),
    ).resolves.toBeTruthy()
    expect(canvas.queryByText('Verified creator')).toBeNull()
  },
}

export const ManyContents: Story = {
  args: { ...mockUserManyContents },
  play: async ({ canvas }) => {
    // Every authored content renders in the contents tab.
    await expect(canvas.findByText(mockContentMinimal.title)).resolves.toBeTruthy()
    await expect(canvas.findByText(mockContentSecond.title)).resolves.toBeTruthy()
    await expect(canvas.findByText(mockContentThird.title)).resolves.toBeTruthy()
  },
}
