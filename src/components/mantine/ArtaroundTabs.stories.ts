import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { createElement } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { Amphora, BadgeInfo } from 'lucide-react'
import { ArtaroundTabs } from './ArtaroundTabs'

const meta = {
  title: 'Artaround Tabs',
  component: ArtaroundTabs,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ArtaroundTabs>

export default meta

type Story = StoryObj<typeof ArtaroundTabs>

export const Default: Story = {
  args: {
    tabs: [{ value: 'info' }, { value: 'contents' }],
  },
}

export const WithIcons: Story = {
  args: {
    tabs: [
      { value: 'info', icon: createElement(BadgeInfo, { size: 16 }) },
      { value: 'contents', icon: createElement(Amphora, { size: 16 }) },
    ],
  },
}

export const WithPanels: Story = {
  args: {
    tabs: [
      { value: 'info', panel: 'Info panel content' },
      { value: 'contents', panel: 'Contents panel content' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Contents' }))
    await expect(canvas.getByText('Contents panel content')).toBeVisible()
  },
}

export const DisabledTab: Story = {
  args: {
    tabs: [{ value: 'info' }, { value: 'contents', disabled: true }],
  },
}

export const Controlled: Story = {
  args: {
    tabs: [{ value: 'info' }, { value: 'contents' }],
    defaultValue: 'info',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Contents' }))
    await expect(args.onChange).toHaveBeenCalledWith('contents')
  },
}
