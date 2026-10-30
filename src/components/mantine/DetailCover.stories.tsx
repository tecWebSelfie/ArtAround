import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, waitFor } from 'storybook/test'
import { DetailCover } from './DetailCover'

// Same-origin demo pictures, served by Storybook from /public.
const photo = (n: number) => ({
  url: `/models/default-standee.svg?photo=${n}`,
  alt: `Photo ${n}`,
})

const meta = {
  component: DetailCover,
  args: { title: 'Red-figure calyx krater' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DetailCover>

export default meta
type Story = StoryObj<typeof meta>

/** One picture: tapping it opens the lightbox (zoom); no "Photos" button. */
export const SinglePhoto: Story = {
  args: { pictures: [photo(1)] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Open photos' })).toBeInTheDocument()
    await expect(canvas.queryByText(/Photos ·/)).not.toBeInTheDocument()
  },
}

/** Several pictures: "Photos · N" opens them all in the lightbox. */
export const Gallery: Story = {
  args: { pictures: [photo(1), photo(2), photo(3)] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Photos · 3/ }))
    await waitFor(() => expect(document.querySelector('.mantine-Lightbox-root, [role="dialog"]')).toBeTruthy())
  },
}

/** An object with a 3D model: the "3D" toggle swaps the photo for the viewer. */
export const WithModel: Story = {
  args: { pictures: [photo(1)], model: { url: '/models/default-standee.glb' } },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole('button', { name: '3D' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    await expect(canvas.getByRole('button', { name: 'Photo' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** In a modal: no lightbox over the modal, the 3D toggle stays. */
export const InModal: Story = {
  args: { pictures: [photo(1)], model: { url: '/models/default-standee.glb' }, lightbox: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Open photos' })).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '3D' })).toBeInTheDocument()
  },
}

/** No picture: the kind's identity stands in (here a tour). */
export const TourFallback: Story = {
  args: { fallback: 'tour' },
}
