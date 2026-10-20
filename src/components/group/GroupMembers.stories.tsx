import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { GroupMemberList } from './GroupMembers'

/** The live member list of the waiting room and group panel, without a LiveKit room. */
const meta = {
  title: 'Group/GroupMemberList',
  component: GroupMemberList,
} satisfies Meta<typeof GroupMemberList>

export default meta
type Story = StoryObj<typeof meta>

/** The host is listed first with its badge, whatever the join order. */
export const HostAndGuests: Story = {
  args: {
    members: [
      { identity: 'guest-1', name: 'Marco', isMe: false },
      { identity: 'host', name: 'Anna', isMe: true },
      { identity: 'guest-2', name: 'Giulia Bianchi', isMe: false },
    ],
  },
  play: async ({ canvas }) => {
    const names = canvas.getAllByText(/^(Anna|Marco|Giulia Bianchi)/)
    await expect(names[0]).toHaveTextContent('Anna')
    await expect(canvas.getByText('Host')).toBeVisible()
    await expect(canvas.getByText('(you)')).toBeVisible()
  },
}

/** Right after "Open the group": only the host is in. */
export const OnlyTheHost: Story = {
  args: { members: [{ identity: 'host', name: 'Anna', isMe: true }] },
}
