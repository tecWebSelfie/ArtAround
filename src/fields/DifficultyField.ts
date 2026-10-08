import { SelectField } from 'payload'

export const DifficultyField = {
  name: 'difficulty',
  type: 'select',
  options: [
    {
      label: 'Easy',
      value: 'easy',
    },
    {
      label: 'Medium',
      value: 'medium',
    },
    {
      label: 'Hard',
      value: 'hard',
    },
  ],
  required: true,
} as const satisfies SelectField

export type Difficulty = (typeof DifficultyField.options)[number]['value']
