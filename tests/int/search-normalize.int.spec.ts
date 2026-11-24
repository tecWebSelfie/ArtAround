import { describe, expect, it } from 'vitest'
import { normalizeSearchInput } from '@/lib/search/query'

describe('normalizeSearchInput', () => {
  it('never cuts a surrogate pair in half', () => {
    // 511 code units then an emoji: a UTF-16 slice(0, 512) would keep a lone high surrogate.
    const { q } = normalizeSearchInput(`${'a'.repeat(511)}😀tail`, 1)
    expect(() => encodeURIComponent(q)).not.toThrow()
    expect(Array.from(q)).toHaveLength(512)
  })
})
