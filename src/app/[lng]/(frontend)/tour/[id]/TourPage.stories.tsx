import { mockTourWithContents } from '@/mocks/tour.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import TourPage from './TourPage'

const lockedId =
  typeof mockTourWithContents.contents[0] === 'string'
    ? mockTourWithContents.contents[0]
    : mockTourWithContents.contents[0]!.id

const meta = {
  title: 'Frontend/Tour/TourPage',
  component: TourPage,
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
    // One content card per timeline item, each linking to its content page
    await expect(canvas.findAllByText('See more')).resolves.toHaveLength(3)
    // One control combo per timeline item
    await expect(canvas.findAllByText('Difficulty')).resolves.toHaveLength(3)
    await expect(canvas.findAllByText('Language')).resolves.toHaveLength(3)
    // Free tour: start right away, or customize a copy. The actions sit in a
    // Mantine Affix, which portals to <body>, outside the story canvas.
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.findByRole('link', { name: /Start tour/ })).resolves.toHaveAttribute(
      'href',
      `/en/tour/${mockTourWithContents.id}/navigation`,
    )
    await expect(page.findByRole('link', { name: /Customize tour/ })).resolves.toBeTruthy()
  },
}

// A paid content the visitor does not own: the CTA offers buying or replacing.
export const WithLockedContents: Story = {
  args: { price: 450, lockedContentIds: [lockedId], isSignedIn: true },
  play: async ({ canvasElement }) => {
    // The Affix actions and the purchase modal both portal to <body>.
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
