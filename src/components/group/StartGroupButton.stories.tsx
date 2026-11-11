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
    // No group name typed: the server draws a random code.
    await expect(lastBody).toEqual({
      tourId: 'tour-1',
      name: 'Anna',
      showResults: true,
      groupName: '',
    })
  },
}

/** A named group: the name goes to the server, whose code is that name normalized. */
export const NamedGroup: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/rooms', async ({ request }) => {
          lastBody = await request.json()
          return HttpResponse.json({ code: 'REDPHOENIX', hostKey: 'key' })
        }),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start with a group' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Group name (optional)' }),
      'Red phoenix',
    )
    await fillAndOpen('Anna')
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith('/en/room/REDPHOENIX'))
    await expect(lastBody).toMatchObject({ groupName: 'Red phoenix' })
  },
}

/** Another open group has that name (409): the host is asked for a different one. */
export const NameTaken: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/rooms', () => HttpResponse.json({ error: 'taken' }, { status: 409 })),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start with a group' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Group name (optional)' }),
      'Red phoenix',
    )
    await fillAndOpen('Anna')
    await expect(
      await screen.findByText(
        'Another group is using this name. Choose a different one.',
        undefined,
        { timeout: 5_000 },
      ),
    ).toBeVisible()
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
      // The error arrives after the request, which under load can outlast 1s.
      await screen.findByText('The group could not be opened. Try again in a minute.', undefined, {
        timeout: 5_000,
      }),
    ).toBeVisible()
  },
}

/** The host's reading/accessibility profile reaches the waiting room, not the invite. */
export const KeepsPersonalProfile: Story = {
  ...OpensTheGroup,
  args: { navigationQuery: 'age=5&audience=children&mobility=wheelchair' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start with a group' }))
    await fillAndOpen('Anna')
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith(
        '/en/room/AB3X9K?age=5&audience=children&mobility=wheelchair',
      ),
    )
  },
}
