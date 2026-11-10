import type { ArrayField, GroupField, TextField } from 'payload'
import { editorial } from '@/fields/editorial'
import { TIME_OF_DAY } from '@/lib/opening-hours'

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
    editorial({ name: 'notes', type: 'textarea', required: false, maxLength: 100 }),
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

/**
 * A time of day at the museum, as `HH:mm` text: the museum's own wall clock,
 * like the map services' hours (`ServiceOpeningHours`). Not a date field: a
 * date is an instant, which the admin picker fills from the editor's zone and
 * pages render in the server's or visitor's zone, so 9:00 could come out as
 * 8:00 or 3:00. Opening hours mean the time on the clocks at the museum,
 * wherever the visitor reads them.
 */
function timeOfDay(name: 'opening' | 'closing'): TextField {
  return {
    name,
    type: 'text',
    admin: { placeholder: name === 'opening' ? '09:00' : '18:00', width: '50%' },
    validate: (value: string | null | undefined) =>
      !value || TIME_OF_DAY.test(value) || 'Use the 24-hour HH:mm format, e.g. 09:30.',
  }
}

function daySchedule(dayName: string): ArrayField {
  return {
    name: dayName,
    type: 'array',
    fields: [{ type: 'row', fields: [timeOfDay('opening'), timeOfDay('closing')] }],
  }
}
