import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { Route } from 'next'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { http, HttpResponse } from 'msw'
import { Notifications, notifications } from '@mantine/notifications'
import { expect, fn, screen, spyOn, userEvent, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { TourForm } from './TourForm'

const copied = fn()
// `/api/tour-copy`: only the stops and the start entrance travel.
const copyHandler = http.post('*/api/tour-copy', async ({ request }) => {
  copied(await request.json())
  return HttpResponse.json({ id: 'copy-1', museumId: 'm' })
})

/**
 * The tour editor as a visit copy. Signed in, the copy is the visitor's own
 * tour with every field; without an account (`anonymous`) only the stops and
 * the start entrance change, and `/api/tour-copy` saves it.
 */
const meta = {
  title: 'Editing/TourForm',
  component: TourForm,
  args: {
    museum: {
      id: 'm',
      name: 'Pinacoteca',
      entrances: [
        { id: 'main', name: 'Main entrance' },
        { id: 'garden', name: 'Garden entrance' },
      ],
    },
    candidates: [
      {
        id: 'a',
        title: 'A knight in motion',
        objectName: 'Saint George',
        price: 0,
        locked: false,
        minutes: 3,
      },
      {
        id: 'b',
        title: 'Heaven above',
        objectName: 'Madonna in Glory',
        price: 0,
        locked: false,
        minutes: 4,
      },
      {
        id: 'c',
        title: 'Hidden mother',
        objectName: 'Portrait',
        price: 450,
        locked: true,
        minutes: 2,
      },
    ],
    initial: {
      title: 'Little explorers',
      description: 'Seven stops for children',
      contents: ['a', 'b', 'c'],
    },
    visitCopyOf: 'tour-1',
    cancelHref: '/en/tour/tour-1' as Route,
  },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="max-w-2xl p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  parameters: {
    msw: { handlers: [copyHandler] },
    nextjs: {
      navigation: {
        segments: [['lng', 'en']],
        pathname: '/en/tour/new',
        query: { from: 'tour-1', visit: '1' },
      },
    },
  },
  beforeEach: () => {
    copied.mockClear()
    sessionStorage.clear()
  },
} satisfies Meta<typeof TourForm>
export default meta
type Story = StoryObj<typeof meta>

/** Signed in: their own private copy, with its texts, cover and quiz. */
export const SignedInCopy: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: /Title/ })).toHaveValue('Little explorers')
    await expect(canvas.getByRole('link', { name: 'Write a new content' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Sign in' })).toBeNull()
  },
}

/**
 * Not signed in: the original's title shown, not editable; the stops
 * changed (the paid one swapped out) and saved through `/api/tour-copy`,
 * then on to the copy's start page with the planner's step-free route.
 */
export const AnonymousCopy: Story = {
  args: { anonymous: true, navigation: 'mobility=wheelchair' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Little explorers' })).toBeVisible()
    await expect(canvas.queryByRole('textbox', { name: /Title/ })).toBeNull()
    await expect(canvas.queryByRole('link', { name: 'Write a new content' })).toBeNull()
    await expect(canvas.queryByRole('textbox', { name: /How to get here/ })).toBeNull()
    // Reading plus 2 min of walking per stop, as the planner counts.
    await expect(canvas.getByText('3 stops, about 15 min')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/en/login?next=${encodeURIComponent('/en/tour/new?from=tour-1&visit=1&draft=1')}`,
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Hidden mother' }))
    await expect(canvas.getByText('2 stops, about 11 min')).toBeVisible()
    // The second stop moves first.
    await userEvent.click(canvas.getAllByRole('button', { name: 'Move up' })[1]!)
    await userEvent.click(canvas.getByRole('button', { name: 'Start with these stops' }))
    await waitFor(() =>
      expect(copied).toHaveBeenCalledWith({
        from: 'tour-1',
        contents: ['b', 'a'],
        startEntrance: null,
      }),
    )
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith(
        '/en/museum/m/navigation/tour/copy-1?mobility=wheelchair',
      ),
    )
  },
}

/** A removed stop comes back where it was with one tap on the toast. */
export const UndoRemove: Story = {
  args: { anonymous: true },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Notifications />
      </>
    ),
  ],
  beforeEach: () => notifications.clean(),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove A knight in motion' }))
    // The toast fades in.
    await waitFor(() => expect(screen.getByText('Removed: A knight in motion')).toBeVisible())
    // Named by the app's provider (`AppMantineProvider`), like every toast's.
    await expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    // The stops' own remove buttons, not the paid-stops alert's.
    const stops = canvas.getAllByRole('button', { name: /^Remove (?!it |them )/ })
    await expect(stops[0]).toHaveAccessibleName('Remove A knight in motion')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull())
  },
}

/** A refusal reads in the visitor's language, not as the route's code. */
export const AnonymousCopyRateLimited: Story = {
  args: { anonymous: true },
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/tour-copy', () =>
          HttpResponse.json({ error: 'Too many requests' }, { status: 429 }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    // Save failures are notifications (`useSave`).
    const show = spyOn(notifications, 'show')
    await userEvent.click(canvas.getByRole('button', { name: 'Start with these stops' }))
    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Too many saves in a short time: wait a minute and try again',
        }),
      ),
    )
    await expect(getRouter().push).not.toHaveBeenCalled()
  },
}

/** The paid-stops notice acts on what it says: one tap takes them out. */
export const RemovePaidStops: Story = {
  args: { anonymous: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove it from the tour' }))
    await expect(canvas.queryByRole('button', { name: 'Remove Hidden mother' })).toBeNull()
    await expect(canvas.queryByText(/paid contents you do not own/)).toBeNull()
    await expect(canvas.getByText('2 stops, about 11 min')).toBeVisible()
  },
}
