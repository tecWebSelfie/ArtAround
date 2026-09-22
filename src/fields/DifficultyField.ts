import { SelectField } from 'payload'

export const DifficultyField: SelectField = {
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
}
