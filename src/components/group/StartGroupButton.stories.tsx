import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { http, HttpResponse } from 'msw'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { StartGroupButton } from './StartGroupButton'

/** "Start with a group": name, the results option, then the room is opened. */
const meta = {
  title: 'Group/StartGroupButton',
  component: StartGroupButton,
  args: { tourId: 'tour-1' },
  parameters: { nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } } },
  beforeEach: () => {
    window.localStorage.removeItem('aa-name')
  },
} satisfies Meta<typeof StartGroupButton>

export default meta
type Story = StoryObj<typeof meta>

let lastBody: unknown

/** The modal renders in a portal, so it is found on the page rather than the canvas. */
async function fillAndOpen(name: string, { showResults = false } = {}) {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Your name' }), name)
  if (showResults) {
    await userEvent.click(screen.getByRole('checkbox', { name: 'See everyone’s quiz results' }))
  }
  await userEvent.click(screen.getByRole('button', { name: 'Open the group' }))
}

/** Opening the group sends the name and the results choice, then goes to the waiting room. */
export const OpensTheGroup: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/rooms', async ({ request }) => {
          lastBody = await request.json()
          return HttpResponse.json({ code: 'AB3X9K', hostKey: 'key' })
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start with a group' }))
    await fillAndOpen('Anna', { showResults: true })
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith('/en/room/AB3X9K'))
    await expect(lastBody).toEqual({ tourId: 'tour-1', name: 'Anna', showResults: true })
  },
}

/** The server can't open a room: the visitor is told to retry. */
export const ServerUnavailable: Story = {
  parameters: {
    msw: { handlers: [http.post('*/api/rooms', () => HttpResponse.json({}, { status: 503 }))] },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start with a group' }))
    await fillAndOpen('Anna')
    await expect(
      await screen.findByText('The group could not be opened. Try again in a minute.'),
    ).toBeVisible()
  },
}
