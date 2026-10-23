import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import { createContent, mockContentSecond, mockContentThird } from '@/mocks/content.mock'
import { mockMuseumMinimal } from '@/mocks/museum.mock'
import { mockObjectFull, mockObjectNoMedia } from '@/mocks/object.mock'
import { serverComponentStory } from '@/mocks/server-component'
import { mockTourMinimal, mockTourSecond } from '@/mocks/tour.mock'
import { mockUserAuthor } from '@/mocks/user.mock'

import { ContentDetails } from './ContentDetails'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ContentDetailsStory = serverComponentStory(ContentDetails)

const meta = {
  title: 'Frontend/Content/ContentDetails',
  ...ContentDetailsStory,
  // The page's Container padding: link rows bleed 8px into it on hover.
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof ContentDetailsStory.component>

export default meta
type Story = StoryObj<typeof meta>

/** Every section: badges, pictures, sources, object + museum, author, tours, siblings. */
export const Full: Story = {
  args: {
    content: createContent({
      audience: 'children',
      price: 450,
      lfrs: { ratingsAverage: 4.4, ratingsCount: 12 },
      sources: [
        { id: 's1', label: 'Beazley, Attic Red-Figure Vase-Painters', url: null },
        { id: 's2', label: 'Beazley Archive Pottery Database', url: 'https://www.carc.ox.ac.uk/' },
      ],
    }),
    object: { ...mockObjectFull, artist: 'Pittore di Berlino', dating: 'c. 490 a.C.' },
    museum: mockMuseumMinimal,
    author: mockUserAuthor,
    categories: [
      { id: 'cat-1', name: 'Archeologia' },
      { id: 'cat-2', name: 'Ceramica' },
    ],
    images: [
      {
        id: 'img-1',
        url: 'https://picsum.photos/seed/content-img-1/600/400',
        alt: 'Dettaglio della scena di banchetto',
      },
      {
        id: 'img-2',
        url: 'https://picsum.photos/seed/content-img-2/600/400',
        alt: 'Retro del vaso',
      },
    ],
    tours: [mockTourMinimal, mockTourSecond],
    related: [mockContentSecond, mockContentThird],
  },
  play: async ({ canvas }) => {
    // The object section links to the object page and names its museum.
    const objectLink = await canvas.findByRole('link', { name: mockObjectFull.name })
    await expect(objectLink.getAttribute('href')).toMatch(/\/object\/object-full-001$/)
    await expect(canvas.findByRole('link', { name: mockMuseumMinimal.name })).resolves.toBeTruthy()
    // Paid but readable here (body present): "Unlocked", not a price.
    await expect(canvas.findByText('Unlocked')).resolves.toBeTruthy()
  },
}

/** A free content whose object has no picture and nothing else around it. */
export const Minimal: Story = {
  args: {
    content: createContent({ copyright: '© Museo Civico di Esempio' }),
    object: mockObjectNoMedia,
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('About the object')).resolves.toBeTruthy()
    await expect(canvas.queryByText('In these tours')).toBeNull()
  },
}

/** Paid and not bought: the body is withheld, so the price badge shows. */
export const Locked: Story = {
  args: {
    content: { ...createContent({ price: 299 }), body: undefined as never },
    object: mockObjectFull,
    museum: mockMuseumMinimal,
  },
}
