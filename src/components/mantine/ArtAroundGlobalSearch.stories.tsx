import { Center } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ArtAroundGlobalSearch, type AutoCompleteItem } from './ArtAroundGlobalSearch'

const items: AutoCompleteItem[] = [
  {
    kind: 'content',
    key: 'content-1',
    title: 'The Farnese Marble',
    href: '/en/content/content-1',
    difficulty: 'medium',
    seconds: 360,
    priceCents: 499,
  },
  {
    kind: 'tour',
    key: 'tour-1',
    title: 'Baroque Rome',
    href: '/en/tour/tour-1',
    subtitle: 'Galleria Borghese · Rome',
    city: 'Rome',
    seconds: 3600,
    difficulty: 'easy',
    stops: 4,
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

/** Opens the list the way a visitor does, by focusing the field. */
const openList: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByPlaceholderText('Look for the next tour'))
}

/**
 * Results of the previous text stay visible but dimmed while the new ones
 * load, and the list is marked busy.
 */
export const Loading: Story = {
  args: { items, status: 'loading', value: 'farn' },
  play: async (context) => {
    await openList(context)
    const list = within(document.body).getByRole('listbox')
    await expect(list).toHaveAttribute('aria-busy', 'true')
  },
}

/** First load: nothing to show yet, so the list says it is searching. */
export const FirstLoad: Story = {
  args: { items: [], status: 'loading' },
  play: async (context) => {
    await openList(context)
    await expect(await within(document.body).findByText('Searching…')).toBeVisible()
  },
}

/** Nothing matched: a hint, and a way out that is itself an option. */
export const NoMatch: Story = {
  args: {
    items: [],
    value: 'qzxwvk',
    browse: { label: 'Browse all tours', href: '/en/marketplace' },
    onOptionSubmit: fn(),
  },
  play: async (context) => {
    await openList(context)
    const page = within(document.body)
    await expect(page.getByText('Nothing matches “qzxwvk”.')).toBeVisible()
    await userEvent.click(page.getByRole('option', { name: /browse all tours/i }))
    await expect(context.args.onOptionSubmit).toHaveBeenCalledWith(
      '/en/marketplace',
      expect.anything(),
    )
  },
}

/** The request failed: said plainly, with a retry option instead of "no matches". */
export const Unreachable: Story = {
  args: { items: [], value: 'tour', status: 'error', onRetry: fn(), onOptionSubmit: fn() },
  play: async (context) => {
    await openList(context)
    const page = within(document.body)
    await expect(page.getByText('Search is not reachable right now.')).toBeVisible()
    await userEvent.click(page.getByRole('option', { name: /try again/i }))
    await expect(context.args.onRetry).toHaveBeenCalled()
    // The retry is an action, not a destination.
    await expect(context.args.onOptionSubmit).not.toHaveBeenCalled()
  },
}
