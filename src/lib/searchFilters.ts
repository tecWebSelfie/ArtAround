import type { ActiveFilter, FilterDefinition, FilterOperator } from 'mantine-composite-filters'
import type { Where } from 'payload'

/**
 * Shared bridge between mantine-composite-filters, the URL (searchParams)
 * and Payload queries.
 *
 * URL is the source of truth. The client serializes with the library's
 * `toQueryString()` which emits `filter[<key>][<operator>]=<value>`
 * (repeated keys for arrays, `<key>_start`/`<key>_end` for date ranges).
 * The server parses that back into ActiveFilters (for the input's initial
 * state) and into a Payload `where` (for the query). Unknown keys and
 * operators not listed in the definitions are ignored.
 */

const FILTER_PARAM = /^filter\[(.+?)\]\[(.+?)\]$/
const RANGE_PARAM = /^(.+)_(start|end)$/

const DEFAULT_OPERATORS: Record<FilterDefinition['type'], FilterOperator[]> = {
  text: ['contains', 'starts_with', 'ends_with', '='],
  email: ['contains', '='],
  number: ['=', '!=', '>', '<', '>=', '<='],
  select: ['='],
  multi_select: ['='],
  date: ['=', '>', '<', '>=', '<='],
  date_range: ['between'],
}

function allowedOperators(def: FilterDefinition): FilterOperator[] {
  return def.operators ?? DEFAULT_OPERATORS[def.type]
}

export function parseFilterSearchParams(
  params: Record<string, string | string[] | undefined>,
  definitions: FilterDefinition[],
): ActiveFilter[] {
  const byKey = new Map(definitions.map((def) => [def.key, def]))
  const filters: ActiveFilter[] = []
  const rangeStarts = new Map<string, string>()
  const rangeEnds = new Map<string, string>()
  let index = 0

  const push = (def: FilterDefinition, operator: FilterOperator, value: string | string[]) => {
    const displayValue = Array.isArray(value) ? value.join(', ') : value
    filters.push({
      id: `initial-${index++}`,
      key: def.key,
      label: def.label,
      type: def.type,
      operator,
      value,
      displayValue,
    })
  }

  for (const [rawKey, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawKey === 'page') continue
    const values = (Array.isArray(rawValue) ? rawValue : [rawValue]).filter((v) => v !== '')

    const filterMatch = FILTER_PARAM.exec(rawKey)
    if (filterMatch) {
      const [, key, operator] = filterMatch
      const def = byKey.get(key)
      if (!def || !allowedOperators(def).includes(operator as FilterOperator)) continue
      // A repeated multi_select `=` round-trips as several params: regroup
      // them into one array-valued filter (Payload `in`).
      if (def.type === 'multi_select' && operator === '=' && values.length > 1) {
        push(def, '=', values)
      } else {
        for (const value of values) push(def, operator as FilterOperator, value)
      }
      continue
    }

    const rangeMatch = RANGE_PARAM.exec(rawKey)
    if (rangeMatch) {
      const [, key, bound] = rangeMatch
      const def = byKey.get(key)
      if (!def || values.length === 0) continue
      ;(bound === 'start' ? rangeStarts : rangeEnds).set(key, values[0])
    }
  }

  for (const def of definitions) {
    const start = rangeStarts.get(def.key)
    const end = rangeEnds.get(def.key)
    if (start || end) {
      push(def, 'between', [start ?? '', end ?? ''])
    }
  }

  return filters
}

function coerceNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? null : n
}

function singleFilterToWhere(filter: ActiveFilter, def: FilterDefinition): Where | null {
  const { key, operator } = filter
  const raw = filter.value

  switch (operator) {
    case '=': {
      if (def.type === 'multi_select' || Array.isArray(raw)) {
        const values = (Array.isArray(raw) ? raw : [raw]).map(String).filter((v) => v !== '')
        return values.length > 0 ? { [key]: { in: values } } : null
      }
      if (def.type === 'number') {
        const value = coerceNumber(raw)
        return value === null ? null : { [key]: { equals: value } }
      }
      const value = String(raw)
      return value === '' ? null : { [key]: { equals: value } }
    }
    case '!=': {
      if (Array.isArray(raw)) {
        const values = raw.map(String).filter((v) => v !== '')
        return values.length > 0 ? { [key]: { not_in: values } } : null
      }
      if (def.type === 'number') {
        const value = coerceNumber(raw)
        return value === null ? null : { [key]: { not_equals: value } }
      }
      const value = String(raw)
      return value === '' ? null : { [key]: { not_equals: value } }
    }
    case '>':
    case '>=':
    case '<':
    case '<=': {
      const fieldOperator =
        operator === '>'
          ? 'greater_than'
          : operator === '>='
            ? 'greater_than_equal'
            : operator === '<'
              ? 'less_than'
              : 'less_than_equal'
      const value = def.type === 'number' ? coerceNumber(raw) : String(raw)
      return value === null || value === '' ? null : { [key]: { [fieldOperator]: value } }
    }
    case 'contains': {
      const value = String(raw)
      return value === '' ? null : { [key]: { contains: value } }
    }
    case 'starts_with': {
      const value = String(raw)
      return value === '' ? null : { [key]: { like: `${value}%` } }
    }
    case 'ends_with': {
      const value = String(raw)
      return value === '' ? null : { [key]: { like: `%${value}` } }
    }
    case 'between': {
      if (!Array.isArray(raw)) return null
      const [start, end] = raw.map(String)
      const and: Where[] = []
      if (start) and.push({ [key]: { greater_than_equal: start } })
      if (end) and.push({ [key]: { less_than_equal: end } })
      return and.length > 0 ? { and } : null
    }
    default:
      return null
  }
}

export function activeFiltersToWhere(
  filters: ActiveFilter[],
  definitions: FilterDefinition[],
): Where {
  const byKey = new Map(definitions.map((def) => [def.key, def]))
  const and: Where[] = []

  for (const filter of filters) {
    const def = byKey.get(filter.key)
    if (!def) continue
    const where = singleFilterToWhere(filter, def)
    if (where) and.push(where)
  }

  return and.length > 0 ? { and } : {}
}
