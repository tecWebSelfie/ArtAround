import { mockContentsList } from '@/mocks/content.mock'
import { mockMuseumFull } from '@/mocks/museum.mock'
import { mockObjectAmphora } from '@/mocks/object.mock'
import { mockTourWithContents } from '@/mocks/tour.mock'
import { tourMuseumId } from '@/lib/tour-navigation'
import type { Tour } from '@/payload-types'
import { AppShell } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import TourPage from './TourPage'

const lockedId =
  typeof mockTourWithContents.contents[0] === 'string'
    ? mockTourWithContents.contents[0]
    : mockTourWithContents.contents[0]!.id

/**
 * A tour as `page.tsx` reads it: museum and author populated, the planner's
 * estimates, a quiz, ratings, and a stop whose picture comes from its object.
 */
const richTour: Tour = {
  ...mockTourWithContents,
  museum: mockMuseumFull,
  durationMinutes: 35,
  distanceMeters: 420,
  wheelchairAccessible: true,
  quiz: { questions: ['question-1', 'question-2', 'question-3'] },
  lfrs: { ratingsAverage: 4.6, ratingsCount: 38 },
  contents: mockContentsList.map((content, index) =>
    index === 0 ? { ...content, objects: { docs: [mockObjectAmphora] } } : content,
  ),
}

const meta = {
  title: 'Frontend/Tour/TourPage',
  component: TourPage,
  // The page renders its actions in the frontend layout's AppShell footer.
  decorators: [
    (Story) => (
      <AppShell footer={{ height: 64, offset: true }}>
        <Story />
      </AppShell>
    ),
  ],
  args: {
    tour: mockTourWithContents,
    price: 0,
    lockedContentIds: [],
    isSignedIn: false,
    canEdit: false,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } },
  },
} satisfies Meta<typeof TourPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.findByText(mockTourWithContents.title)).resolves.toBeTruthy()
    // One link per stop, each to its content page
    await expect(canvas.findAllByRole('link', { name: /See more about/ })).resolves.toHaveLength(3)
    // Free tour: start right away, or customize a copy (footer actions).
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.findByRole('link', { name: /Start tour/ })).resolves.toHaveAttribute(
      'href',
      `/en/museum/${tourMuseumId(mockTourWithContents)}/navigation/tour/${mockTourWithContents.id}`,
    )
    await expect(page.findByRole('link', { name: /Customize tour/ })).resolves.toBeTruthy()
  },
}

// A paid content the visitor does not own: the CTA offers buying or replacing.
export const WithLockedContents: Story = {
  args: { price: 450, lockedContentIds: [lockedId], isSignedIn: true },
  play: async ({ canvasElement }) => {
    // The purchase modal portals to <body>.
    const body = canvasElement.ownerDocument.body
    await userEvent.click(await within(body).findByRole('button', { name: /Unlock for/ }))
    // The modal opens with a transition, slower than findBy's 1s default under load.
    await expect(
      within(body).findByRole('link', { name: /Replace the paid contents/ }, { timeout: 15_000 }),
    ).resolves.toHaveAttribute('href', `/en/tour/new?from=${mockTourWithContents.id}`)
  },
}

export const AnonymousWithLockedContents: Story = {
  args: { price: 450, lockedContentIds: [lockedId], isSignedIn: false },
}

// Everything the overview can show: cover, museum, estimates, access, quiz, rating.
export const Rich: Story = {
  args: { tour: richTour, price: 450, lockedContentIds: [lockedId], isSignedIn: true },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Step-free route')).resolves.toBeTruthy()
    await expect(canvas.findByText('Ends with a quiz')).resolves.toBeTruthy()
    await expect(canvas.findByRole('link', { name: mockMuseumFull.name })).resolves.toHaveAttribute(
      'href',
      `/en/museum/${mockMuseumFull.id}`,
    )
  },
}
