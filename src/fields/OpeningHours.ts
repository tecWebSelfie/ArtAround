import { ArrayField, GroupField } from 'payload'

export const OpeningHours: GroupField = {
  name: 'openingHours',
  type: 'group',
  fields: [
    daySchedule('monday'),
    daySchedule('tuesday'),
    daySchedule('wednesday'),
    daySchedule('thursday'),
    daySchedule('friday'),
    daySchedule('saturday'),
    daySchedule('sunday'),
    {
      name: 'notes',
      type: 'textarea',
      required: false,
      maxLength: 100,
    },
  ],
}

// da completare se si vuole
const ExtraordinarySchedule: ArrayField = {
  name: 'extraordinaryOpeningHours',
  type: 'array',
  fields: [
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate', //se non c'è, l'orario straordinario è solo per un giorno
      type: 'date',
      required: false,
    },
  ],
}

function daySchedule(dayName: string): ArrayField {
  return {
    name: dayName,
    type: 'array',
    fields: [
      {
        name: 'opening',
        type: 'date',
      },
      {
        name: 'closing',
        type: 'date',
      },
    ],
    validate: () => {
      //TODO
    },
  }
}
