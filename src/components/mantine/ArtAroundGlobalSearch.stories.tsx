import { Center } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArtAroundGlobalSearch, type AutoCompleteItem } from './ArtAroundGlobalSearch'

const items: AutoCompleteItem[] = [
  {
    kind: 'content',
    key: 'content-1',
    title: 'The Farnese Marble',
    href: '/en/content/content-1',
    difficulty: 'medium',
    readingTimeMins: 6,
  },
  {
    kind: 'tour',
    key: 'tour-1',
    title: 'Baroque Rome',
    href: '/en/tour/tour-1',
    subtitle: 'A walk through churches and fountains · Rome',
    city: 'Rome',
  },
  {
    kind: 'museum',
    key: 'museum-1',
    title: 'Pinacoteca di Brera',
    href: '/en/museum/museum-1',
    city: 'Milan',
  },
  {
    kind: 'object',
    key: 'object-1',
    title: 'The Kiss',
    href: '/en/object/object-1',
    subtitle: 'Francesco Hayez · Pinacoteca di Brera · Milan',
    city: 'Milan',
  },
  {
    kind: 'user',
    key: 'user-1',
    title: 'Anna Rossi',
    href: '/en/user/user-1',
    subtitle: '@annarossi · Curator',
  },
]

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
    items,
  },
}
