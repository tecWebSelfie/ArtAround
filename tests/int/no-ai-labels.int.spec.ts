import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Requirement 10 of `docs/plan/requisiti-18-33.md` (course constraint): the
 * visitor never learns that a language model is involved, and generated
 * contents differ from human ones only in their metadata. So no interface
 * copy shown to visitors may mention AI, generation or language models.
 *
 * `map-editor` is staff tooling for the objects' 3D models (Mint), not for
 * contents, and is the one namespace allowed to say "generated".
 */
const LOCALES = path.resolve(__dirname, '../../src/app/i18n/locales/en')
const STAFF_ONLY = new Set(['map-editor.json'])
const AI_WORDING =
  /\b(AI|A\.I\.|artificial intelligence|generated|LLM|language model|Groq|machine[- ]translat)/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('no AI wording in visitor-facing copy', () => {
  const files = readdirSync(LOCALES).filter((file) => file.endsWith('.json'))

  it('reads every English namespace', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files.filter((file) => !STAFF_ONLY.has(file)))('%s says nothing about AI', (file) => {
    const copy = strings(JSON.parse(readFileSync(path.join(LOCALES, file), 'utf8')))
    expect(copy.filter((text) => AI_WORDING.test(text))).toEqual([])
  })

  it('keeps generation in content metadata only', async () => {
    const { ContentVariants } = await import('@/collections/ContentVariants')
    const generation = ContentVariants.fields.find(
      (field) => 'name' in field && field.name === 'generation',
    )
    expect(generation).toBeDefined()
  })
})
