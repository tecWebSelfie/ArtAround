/**
 * Reads a museum "config file": the file Payload's import/export plugin
 * produces when a developer exports a museum from the admin panel
 * (Museums → select it → Export). Importing it in the "Change museum" modal
 * locks the app to that museum.
 *
 * The plugin writes either JSON (an array of documents) or CSV (a header row
 * with `id`, `name`, … and one row per document). Only the first museum's
 * `id` and `name` are needed: the server looks the museum up by id, and by
 * name when the file comes from another database.
 */
export type MuseumConfig = { id: string | null; name: string | null }

function fromJson(text: string): MuseumConfig | null {
  const data: unknown = JSON.parse(text)
  const first = Array.isArray(data)
    ? data[0]
    : data && typeof data === 'object' && 'docs' in data && Array.isArray(data.docs)
      ? data.docs[0]
      : data
  if (!first || typeof first !== 'object') return null
  const { id, name } = first as { id?: unknown; name?: unknown }
  return {
    id: typeof id === 'string' ? id : null,
    name: typeof name === 'string' ? name : null,
  }
}

/** One CSV line into cells, honouring "quoted, cells" and "" escapes. */
function csvCells(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"'
      i++
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else cell += char
  }
  cells.push(cell)
  return cells
}

function fromCsv(text: string): MuseumConfig | null {
  const [header, row] = text.split(/\r?\n/).filter((line) => line.trim())
  if (!header || !row) return null
  const keys = csvCells(header).map((key) => key.trim())
  const values = csvCells(row)
  const value = (key: string) => values[keys.indexOf(key)]?.trim() || null
  return { id: value('id'), name: value('name') }
}

export function parseMuseumConfig(text: string): MuseumConfig | null {
  try {
    const config =
      text.trimStart().startsWith('[') || text.trimStart().startsWith('{')
        ? fromJson(text)
        : fromCsv(text)
    return config && (config.id || config.name) ? config : null
  } catch {
    return null
  }
}
