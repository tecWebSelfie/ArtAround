import { mockContentSecond } from '@/mocks/content.mock'
import { mockMuseumBrera } from '@/mocks/museum.mock'
import { mockTourSecond } from '@/mocks/tour.mock'
import { mockUserCurator } from '@/mocks/user.mock'
import { Center } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArtAroundGlobalSearch } from './ArtAroundGlobalSearch'

const meta = {
  title: 'Components/ArtAroundGlobalSearch',
  component: ArtAroundGlobalSearch,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <Center my={'sm'}>
      <ArtAroundGlobalSearch {...args} />
    </Center>
  ),
} satisfies Meta<typeof ArtAroundGlobalSearch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      { kind: 'content', content: mockContentSecond, key: mockContentSecond.id },
      { kind: 'tour', tour: mockTourSecond, key: mockTourSecond.id },
      { kind: 'museum', museum: mockMuseumBrera, key: mockMuseumBrera.id },
      { kind: 'user', user: mockUserCurator, key: mockUserCurator.id },
    ],
  },
}
