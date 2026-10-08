import type { FilterDefinition } from 'mantine-composite-filters'
import { describe, expect, it } from 'vitest'

import { activeFiltersToWhere, parseFilterSearchParams } from '@/lib/searchFilters'

const definitions: FilterDefinition[] = [
  {
    key: 'title',
    label: 'Title',
    type: 'text',
    operators: ['contains', 'starts_with', 'ends_with', '='],
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    type: 'select',
    operators: ['='],
    options: [
      { value: 'easy', label: 'Easy' },
      { value: 'hard', label: 'Hard' },
    ],
  },
]

describe('parseFilterSearchParams', () => {
  it('parses filter[key][operator] params into active filters', () => {
    const filters = parseFilterSearchParams(
      { 'filter[title][contains]': 'bronzo' },
      definitions,
    )
    expect(filters).toHaveLength(1)
    expect(filters[0]).toMatchObject({ key: 'title', operator: 'contains', value: 'bronzo' })
  })

  it('ignores unknown keys, operators and the page param', () => {
    const filters = parseFilterSearchParams(
      {
        'filter[title][regex]': 'x',
        'filter[nope][contains]': 'x',
        page: '2',
      },
      definitions,
    )
    expect(filters).toHaveLength(0)
  })

  it('regroups repeated multi_select params', () => {
    const multi: FilterDefinition[] = [
      { key: 'tags', label: 'Tags', type: 'multi_select', operators: ['='] },
    ]
    const filters = parseFilterSearchParams(
      { 'filter[tags][=]': ['a', 'b'] },
      multi,
    )
    expect(filters).toHaveLength(1)
    expect(filters[0].value).toEqual(['a', 'b'])
  })
})

describe('activeFiltersToWhere', () => {
  it('maps text operators to Payload operators', () => {
    const where = activeFiltersToWhere(
      [
        {
          id: '1',
          key: 'title',
          label: 'Title',
          type: 'text',
          operator: 'contains',
          value: 'bronzo',
          displayValue: 'bronzo',
        },
        {
          id: '2',
          key: 'title',
          label: 'Title',
          type: 'text',
          operator: 'starts_with',
          value: 'Il',
          displayValue: 'Il',
        },
      ],
      definitions,
    )
    expect(where).toEqual({
      and: [{ title: { contains: 'bronzo' } }, { title: { like: 'Il%' } }],
    })
  })

  it('maps select = to equals and drops empty values', () => {
    const where = activeFiltersToWhere(
      [
        {
          id: '1',
          key: 'difficulty',
          label: 'Difficulty',
          type: 'select',
          operator: '=',
          value: 'easy',
          displayValue: 'easy',
        },
        {
          id: '2',
          key: 'title',
          label: 'Title',
          type: 'text',
          operator: 'contains',
          value: '',
          displayValue: '',
        },
      ],
      definitions,
    )
    expect(where).toEqual({ and: [{ difficulty: { equals: 'easy' } }] })
  })

  it('returns an empty where without filters', () => {
    expect(activeFiltersToWhere([], definitions)).toEqual({})
  })
})
