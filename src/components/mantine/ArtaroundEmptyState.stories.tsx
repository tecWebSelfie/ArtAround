import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { Route } from 'next'
import { expect } from 'storybook/test'

import { ArtaroundEmptyState } from './ArtaroundEmptyState'

const meta = {
  title: 'Empty State',
  component: ArtaroundEmptyState,
  parameters: { layout: 'padded' },
  args: { kind: 'tour', heading: 'Tours', title: 'Paolo hasn’t created any tours yet' },
} satisfies Meta<typeof ArtaroundEmptyState>

type Story = StoryObj<typeof meta>

export default meta

/** Someone else's empty profile: a plain statement, no action. */
export const Visitor: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('heading', { name: 'Tours' })).resolves.toBeTruthy()
    expect(canvas.queryByRole('link')).toBeNull()
  },
}

/** The owner's own profile: what goes here and the way to make the first one. */
export const OwnerTour: Story = {
  args: {
    title: 'Your first tour starts here',
    description: 'Pick the works you love and put them in order: a route to take and share.',
    action: { label: 'Create a tour', href: '/en/tour/new' as Route },
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByRole('link', { name: 'Create a tour' })).resolves.toHaveAttribute(
      'href',
      '/en/tour/new',
    )
  },
}

/** The contents section, in the content teal. */
export const OwnerContent: Story = {
  args: {
    kind: 'content',
    heading: 'Contents',
    title: 'Tell the story of a work',
    description:
      'What you write about a work shows up here, ready for the visitors who stop in front of it.',
    action: { label: 'Write a content', href: '/en/content/new' as Route },
  },
}
