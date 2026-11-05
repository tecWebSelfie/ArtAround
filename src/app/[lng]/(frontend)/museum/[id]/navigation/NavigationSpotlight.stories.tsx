import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { spotlight } from '@mantine/spotlight'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { Route } from 'next'
import type { NavigationCommand } from './navigation-commands'
import { NavigationSpotlight } from './NavigationSpotlight'

const command = (
  id: string,
  label: string,
  group: NavigationCommand['group'],
  extra: Partial<NavigationCommand> = {},
): NavigationCommand => ({
  id,
  label,
  description: group === 'quick' ? 'Service' : 'Gallery exhibit',
  group,
  href: `/en/museum/m/navigation/tour/t/0?${id}` as Route,
  replace: group === 'quick',
  ...extra,
})

const commands = [
  command('service-type:bathrooms', 'Nearest toilets', 'quick'),
  command('exit:nearest', 'Nearest exit', 'quick'),
  command('object:amphora', 'Attic amphora', 'object'),
  command('content:free', 'The potter’s wheel', 'content'),
  command('content:paid', 'Workshop secrets', 'content', { lockedPrice: 450 }),
]

const meta = {
  title: 'Tour Navigation/Search',
  component: NavigationSpotlight,
  // Supplies the i18next instance (interpolated English fallbacks).
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  args: { commands, nearby: [commands[4]], onRun: fn() },
  parameters: { nextjs: { navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof NavigationSpotlight>
export default meta
type Story = StoryObj<typeof meta>

/** Empty query: nearby suggestions and quick actions as pills. */
export const EmptyShowsPills: Story = {
  play: async ({ canvasElement, args }) => {
    spotlight.open()
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText('Quick actions')).toBeVisible()
    // The paid nearby content carries the locked price badge.
    const paid = await body.findByRole('button', { name: /Workshop secrets/ })
    await expect(paid).toHaveTextContent('€4.50')
    await userEvent.click(body.getByRole('button', { name: 'Nearest toilets' }))
    await expect(args.onRun).toHaveBeenCalledWith(commands[0])
  },
}

export const SearchResults: Story = {
  play: async ({ canvasElement, args }) => {
    spotlight.open()
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByRole('textbox', { name: 'Search' }), 'workshop')
    const result = await body.findByRole('button', { name: /Workshop secrets/ })
    await expect(body.queryByText('Quick actions')).toBeNull()
    await userEvent.click(result)
    await expect(args.onRun).toHaveBeenCalledWith(commands[4])
  },
}

export const NothingFound: Story = {
  play: async ({ canvasElement }) => {
    spotlight.open()
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByRole('textbox', { name: 'Search' }), 'zzz')
    await expect(await body.findByText('No results found')).toBeVisible()
  },
}

/**
 * The on-screen equivalents of the controlled voice commands
 * (`src/lib/voice-vocabulary.ts`): each phrase's command is a pill too.
 */
const voiceCommands = [
  command('previous-stop', 'Previous stop', 'quick', { description: 'Tour' }),
  command('what-is-this', 'What is this?', 'quick', { description: 'Position' }),
  command('author', 'Who is the author?', 'quick', { description: 'Raphael' }),
  command('style', 'What style is it?', 'quick', { description: 'High Renaissance' }),
]

export const VoiceCommandPills: Story = {
  args: { commands: voiceCommands, nearby: [] },
  play: async ({ canvasElement, args }) => {
    spotlight.open()
    const body = within(canvasElement.ownerDocument.body)
    for (const { label } of voiceCommands) {
      await expect(await body.findByRole('button', { name: label })).toBeVisible()
    }
    await userEvent.click(body.getByRole('button', { name: 'Who is the author?' }))
    await expect(args.onRun).toHaveBeenCalledWith(voiceCommands[2])
  },
}
