import type { ActiveFilter, FilterDefinition, FilterOperator } from 'mantine-composite-filters'
import type { Where, WhereField } from 'payload'

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

/** One search param's values, without the empty ones. */
const nonEmpty = (raw: string | string[]) => [raw].flat().filter((value) => value !== '')

export function parseFilterSearchParams(
  params: Record<string, string | string[] | undefined>,
  definitions: FilterDefinition[],
): ActiveFilter[] {
  const byKey = new Map(definitions.map((def) => [def.key, def]))
  const filters: ActiveFilter[] = []
  const rangeStarts = new Map<string, string>()
  const rangeEnds = new Map<string, string>()

  const push = (def: FilterDefinition, operator: FilterOperator, value: string | string[]) => {
    filters.push({
      id: `initial-${filters.length}`,
      key: def.key,
      label: def.label,
      type: def.type,
      operator,
      value,
      displayValue: [value].flat().join(', '),
    })
  }

  // `?q=` (a plain search link, the convention of the marketplace and the
  // navigator): "title (or name) contains q", shown as an ordinary filter
  // chip the visitor can edit or remove.
  const readQuery = (values: string[]) => {
    const def = byKey.get('title') ?? byKey.get('name')
    if (def && values[0] && allowedOperators(def).includes('contains')) {
      push(def, 'contains', values[0])
    }
  }

  // `filter[<key>][<operator>]`: one filter per value, except a repeated
  // multi_select `=`, regrouped into one array-valued filter (Payload `in`).
  const readFilter = (key: string, operator: string, values: string[]) => {
    const def = byKey.get(key)
    if (!def || !allowedOperators(def).includes(operator as FilterOperator)) return
    if (def.type === 'multi_select' && operator === '=' && values.length > 1) {
      push(def, '=', values)
      return
    }
    for (const value of values) push(def, operator as FilterOperator, value)
  }

  for (const [rawKey, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawKey === 'page') continue
    const values = nonEmpty(rawValue)
    const filterMatch = FILTER_PARAM.exec(rawKey)
    const rangeMatch = RANGE_PARAM.exec(rawKey)
    if (rawKey === 'q') readQuery(values)
    else if (filterMatch) readFilter(filterMatch[1], filterMatch[2], values)
    else if (rangeMatch && byKey.has(rangeMatch[1]) && values.length > 0) {
      // `<key>_start` / `<key>_end`: paired into one `between` below.
      ;(rangeMatch[2] === 'start' ? rangeStarts : rangeEnds).set(rangeMatch[1], values[0])
    }
  }

  for (const def of definitions) {
    const start = rangeStarts.get(def.key)
    const end = rangeEnds.get(def.key)
    if (start || end) push(def, 'between', [start ?? '', end ?? ''])
  }

  return filters
}

function coerceNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? null : n
}

/** The Payload condition of each single-value operator. */
const SCALAR_WHERE: Partial<Record<FilterOperator, (value: string | number) => WhereField>> = {
  '=': (value) => ({ equals: value }),
  '!=': (value) => ({ not_equals: value }),
  '>': (value) => ({ greater_than: value }),
  '>=': (value) => ({ greater_than_equal: value }),
  '<': (value) => ({ less_than: value }),
  '<=': (value) => ({ less_than_equal: value }),
  contains: (value) => ({ contains: value }),
  starts_with: (value) => ({ like: `${value}%` }),
  ends_with: (value) => ({ like: `%${value}` }),
}

/** A date range: either bound may be missing. */
function betweenWhere(key: string, raw: unknown): Where | null {
  if (!Array.isArray(raw)) return null
  const [start, end] = raw.map(String)
  const and: Where[] = []
  if (start) and.push({ [key]: { greater_than_equal: start } })
  if (end) and.push({ [key]: { less_than_equal: end } })
  return and.length > 0 ? { and } : null
}

/**
 * One active filter as a Payload condition, or null when it holds nothing
 * usable (an empty value, a number that isn't one). Lists (a multi_select,
 * a repeated value) become `in` / `not_in`; numbers are compared as numbers.
 */
function singleFilterToWhere(filter: ActiveFilter, def: FilterDefinition): Where | null {
  const { key, operator, value: raw } = filter
  if (operator === 'between') return betweenWhere(key, raw)

  const list = operator === '=' || operator === '!='
  if (list && (Array.isArray(raw) || (operator === '=' && def.type === 'multi_select'))) {
    const values = [raw]
      .flat()
      .map(String)
      .filter((value) => value !== '')
    if (values.length === 0) return null
    return { [key]: { [operator === '=' ? 'in' : 'not_in']: values } }
  }

  const condition = SCALAR_WHERE[operator]
  const value = def.type === 'number' ? coerceNumber(raw) : String(raw)
  if (!condition || value === null || value === '') return null
  return { [key]: condition(value) }
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
