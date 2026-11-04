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

import type { WorkSubjects } from '@/lib/subjects'
import { ObjectDetailsContent } from './ObjectDetailsModal'
import { serverComponentStory } from '@/mocks/server-component'

const mockObjectWithContents = createObject({
  contents: [mockContentMinimal, mockContentSecond],
})

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ObjectDetailsModalStory = serverComponentStory(
  async ({
    object,
    subjects,
  }: {
    object: typeof mockObjectWithContents
    subjects?: WorkSubjects
  }) => (
    <Modal opened title={object.name} onClose={() => {}}>
      <ObjectDetailsContent object={object} subjects={subjects} />
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
    await expect(body.findAllByText('Anfora a figure rosse')).resolves.toHaveLength(2)
    await expect(
      body.findByText(
        'Anfora attica a figure rosse con scena di banchetto, databile al V secolo a.C.',
      ),
    ).resolves.toBeTruthy()
    await expect(body.findByText('Related contents')).resolves.toBeTruthy()
    await expect(body.findByText('Storia della ceramica attica')).resolves.toBeTruthy()
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
    // A null thumbnail falls back to the placeholder picture (DetailCover). It is
    // decorative (empty alt, so role "presentation"): the name is the title.
    await expect(body.getByRole('presentation')).toBeInTheDocument()
  },
}

export const WithoutDescription: Story = {
  args: {
    object: mockObjectNoDescription,
  },
  play: async () => {
    const body = within(document.body)
    await expect(body.findAllByText('Anfora a figure rosse')).resolves.toHaveLength(2)
  },
}

export const WithoutRelatedContents: Story = {
  args: {
    object: mockObjectNoContents,
  },
  play: async () => {
    const body = within(document.body)
    await expect(body.findAllByText('Anfora a figure rosse')).resolves.toHaveLength(2)
    await expect(body.queryByText('Related contents')).not.toBeInTheDocument()
  },
}

/** A work linked to its Wikidata subjects: author and style link to their pages. */
export const WithSubjects: Story = {
  args: {
    object: createObject({ name: 'Ecstasy of Saint Cecilia', dating: 'c. 1514–1516' }),
    subjects: {
      creators: [{ id: 'subject-raphael', name: 'Raphael', kind: 'person' }],
      movements: [{ id: 'subject-high-renaissance', name: 'High Renaissance', kind: 'movement' }],
      events: [],
    },
  },
  play: async () => {
    const body = within(document.body)
    const author = await body.findByRole('link', { name: 'Raphael' })
    await expect(author.getAttribute('href')).toMatch(/\/subject\/subject-raphael$/)
    await expect(body.findByRole('link', { name: 'High Renaissance' })).resolves.toBeTruthy()
    await expect(body.findByText(/c\. 1514–1516/)).resolves.toBeTruthy()
  },
}
