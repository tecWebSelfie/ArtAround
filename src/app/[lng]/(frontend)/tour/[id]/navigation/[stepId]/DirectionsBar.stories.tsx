import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { DirectionStep } from '@/lib/tour-directions'
import { DirectionsBar } from './DirectionsBar'

// The steps `buildDirections` produces for foyer → archaeology on the
// realistic fixture museum (see tests/int/tour-guidance.int.spec.ts).
const steps: DirectionStep[] = [
  { kind: 'start', room: 'Foyer e biglietteria', metres: 3, from: 0 },
  {
    kind: 'enter',
    room: 'Galleria di distribuzione',
    door: 'Accesso alle collezioni',
    turn: 'right',
    metres: 11,
    from: 3,
  },
  { kind: 'enter', room: 'Archeologia', door: 'Ingresso archeologia', turn: 'left', metres: 3, from: 14 },
  { kind: 'arrive', side: 'left', from: 15 },
]

const meta = {
  title: 'Tour Navigation/Directions Bar',
  component: DirectionsBar,
  // Supplies the i18next instance (interpolated English fallbacks).
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  args: {
    steps,
    current: 0,
    onCurrentChange: fn(),
    destination: 'Attic amphora',
    status: null,
  },
  // Stateful wrapper so the arrows really move between steps.
  render: function Render(args) {
    const [current, setCurrent] = useState(args.current)
    return (
      <div style={{ width: 320 }}>
        <DirectionsBar
          {...args}
          current={current}
          onCurrentChange={(index) => {
            setCurrent(index)
            args.onCurrentChange(index)
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof DirectionsBar>
export default meta
type Story = StoryObj<typeof meta>

export const FirstStep: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Start in Foyer e biglietteria')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Previous step' })).toBeDisabled()
  },
}

export const NextStepWithArrow: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }))
    await expect(args.onCurrentChange).toHaveBeenCalledWith(1)
    await expect(
      canvas.getByText('Turn right through Accesso alle collezioni into Galleria di distribuzione'),
    ).toBeVisible()
    await expect(canvas.getByText(/Step 2 of 4/)).toBeVisible()
  },
}

export const Arrival: Story = {
  args: { current: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Attic amphora is on your left')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Next step' })).toBeDisabled()
  },
}

export const AllStepsModal: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show all directions' }))
    const body = within(canvasElement.ownerDocument.body)
    const dialog = await body.findByRole('dialog', { name: 'Directions to Attic amphora' })
    // Mantine's modal fades in; wait for it rather than asserting mid-transition.
    await waitFor(
      () =>
        expect(
          within(dialog).getByText('Turn left through Ingresso archeologia into Archeologia'),
        ).toBeVisible(),
      { timeout: 5_000 },
    )
    // Choosing a step in the list jumps the bar to it and closes the modal.
    await userEvent.click(within(dialog).getByText('Attic amphora is on your left'))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByText('Attic amphora is on your left')).toBeVisible()
  },
}

export const TourCompleted: Story = {
  args: { status: 'complete', steps: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Tour completed')
  },
}

export const NoRoute: Story = {
  args: { status: 'unavailable', steps: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No route available between these objects')).toBeVisible()
  },
}

export const NeedsPosition: Story = {
  args: {
    status: 'no-destination',
    steps: [],
    hint: 'Open an object and set it as your position',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Choose where to go from search')).toBeVisible()
    await expect(canvas.getByText('Open an object and set it as your position')).toBeVisible()
  },
}
