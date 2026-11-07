import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { PlanVisitPage } from './PlanVisitPage'

/** A restored family preview is the same public UI used after planning. */
const meta = {
  title: 'Navigator/PlanVisit',
  component: PlanVisitPage,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  args: {
    museums: [{ value: 'm', label: 'Pinacoteca, Bologna', name: 'Pinacoteca' }],
    lockedMuseum: null,
  },
  parameters: {
    nextjs: {
      navigation: {
        segments: [['lng', 'en']],
        pathname: '/en/tour/plan',
        query: { tour: 'planned' },
      },
    },
  },
  beforeEach: () => {
    sessionStorage.setItem(
      'aa-plan-visit',
      JSON.stringify({
        answers: {
          museumId: 'm',
          minutes: '30',
          returning: 'returning',
          adults: 2,
          childrenAges: [5, 8],
          interests: 'Renaissance details',
          wheelchair: true,
          reader: 'adult',
        },
        plan: {
          id: 'planned',
          museumId: 'm',
          title: 'Renaissance details',
          description: 'A visit through the galleries.',
          totalMinutes: 12,
          stops: [
            {
              id: 'c',
              title: 'Saint Cecilia',
              objectName: 'Saint Cecilia',
              room: 'Gallery 1',
              minutes: 10,
            },
          ],
        },
      }),
    )
    return () => sessionStorage.removeItem('aa-plan-visit')
  },
} satisfies Meta<typeof PlanVisitPage>
export default meta
type Story = StoryObj<typeof meta>

export const FamilyPreview: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Renaissance details' })).toBeVisible()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Reading for' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Child aged 8' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Start the visit' }))
    await waitFor(() =>
      expect(getRouter().push).toHaveBeenCalledWith(
        '/en/museum/m/navigation/tour/planned/0?mobility=wheelchair&age=8&audience=children',
      ),
    )
    await expect(canvas.getByRole('button', { name: 'Start with a group' })).toBeVisible()
  },
}

export const Form: Story = {
  parameters: { nextjs: { navigation: { query: {} } } },
  beforeEach: () => sessionStorage.removeItem('aa-plan-visit'),
}

/** Incomplete ages stay in the form; an invalid family never reaches the API. */
export const MissingChildAge: Story = {
  parameters: { nextjs: { navigation: { query: {} } } },
  beforeEach: () =>
    sessionStorage.setItem(
      'aa-plan-visit',
      JSON.stringify({
        answers: {
          museumId: 'm',
          minutes: '30',
          adults: 2,
          childrenAges: ['', 8],
          returning: 'first',
          interests: '',
          wheelchair: false,
          reader: 'adult',
        },
        plan: null,
      }),
    ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Plan my visit$/ }))
    await expect(await canvas.findByText("Enter each child's age, from 0 to 17.")).toBeVisible()
  },
}
