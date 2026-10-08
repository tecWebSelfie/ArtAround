import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import {
  DIFFICULTY_LABEL_KEY,
  DifficultyBadge,
} from './DifficultyBadge'

const meta = {
  title: 'Difficulty Badge',
  component: DifficultyBadge,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DifficultyBadge>

type Story = StoryObj<typeof meta>

export default meta

export const Easy: Story = {
  args: {
    difficulty: 'easy',
    children: DIFFICULTY_LABEL_KEY.easy,
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Easy')).resolves.toBeTruthy()
  },
}

export const Medium: Story = {
  args: {
    difficulty: 'medium',
    children: DIFFICULTY_LABEL_KEY.medium,
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Medium')).resolves.toBeTruthy()
  },
}

export const Hard: Story = {
  args: {
    difficulty: 'hard',
    children: DIFFICULTY_LABEL_KEY.hard,
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Hard')).resolves.toBeTruthy()
  },
}

export const FallbackLabel: Story = {
  args: {
    difficulty: 'easy',
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Easy')).resolves.toBeTruthy()
  },
}
