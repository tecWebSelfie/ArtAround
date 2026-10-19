import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Modal } from '@mantine/core'
import { expect, within } from 'storybook/test'

import { mockContentMinimal, mockContentSecond } from '@/mocks/content.mock'
import {
  createObject,
  mockObjectMosaicNoThumbnail,
  mockObjectNoDescription,
  mockObjectNoContents,
} from '@/mocks/object.mock'

import { ObjectDetailsContent } from './ObjectDetailsModal'
import { serverComponentStory } from '@/mocks/server-component'

const mockObjectWithContents = createObject({
  contents: [mockContentMinimal, mockContentSecond],
})

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ObjectDetailsModalStory = serverComponentStory(
  async ({ object }: { object: typeof mockObjectWithContents }) => (
    <Modal opened title={object.name} onClose={() => {}}>
      <ObjectDetailsContent object={object} />
    </Modal>
  ),
)

const meta = {
  title: 'Object Details Modal',
  ...ObjectDetailsModalStory,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ObjectDetailsModalStory.component>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    object: mockObjectWithContents,
  },
  play: async () => {
    const body = within(document.body)
    // The object name renders twice: modal header title + content Title
    await expect(
      body.findAllByText('Anfora a figure rosse'),
    ).resolves.toHaveLength(2)
    await expect(
      body.findByText(
        'Anfora attica a figure rosse con scena di banchetto, databile al V secolo a.C.',
      ),
    ).resolves.toBeTruthy()
    await expect(body.findByText('Related contents')).resolves.toBeTruthy()
    await expect(
      body.findByText('Storia della ceramica attica'),
    ).resolves.toBeTruthy()
    await expect(body.findByText('Il restauro del bronzo')).resolves.toBeTruthy()
  },
}

export const WithoutThumbnail: Story = {
  args: {
    object: mockObjectMosaicNoThumbnail,
  },
  play: async () => {
    const body = within(document.body)
    await expect(body.findAllByText('Mosaico pavimentale')).resolves.toHaveLength(2)
    // Null thumbnail falls back to the placeholder image, labelled with the object name
    await expect(body.findByAltText('Mosaico pavimentale')).resolves.toBeTruthy()
  },
}

export const WithoutDescription: Story = {
  args: {
    object: mockObjectNoDescription,
  },
  play: async () => {
    const body = within(document.body)
    await expect(
      body.findAllByText('Anfora a figure rosse'),
    ).resolves.toHaveLength(2)
  },
}

export const WithoutRelatedContents: Story = {
  args: {
    object: mockObjectNoContents,
  },
  play: async () => {
    const body = within(document.body)
    await expect(
      body.findAllByText('Anfora a figure rosse'),
    ).resolves.toHaveLength(2)
    await expect(body.queryByText('Related contents')).not.toBeInTheDocument()
  },
}
