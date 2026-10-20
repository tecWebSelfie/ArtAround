import { describe, expect, it } from 'vitest'
import { inLanguage } from '@/lib/app-url'

// Printed QR codes are language-free; the in-app scanner opens them in the
// app's language, and replaces the prefix of older localized codes.
describe('inLanguage', () => {
  it('adds the current language to a language-free path', () => {
    expect(inLanguage('/tour/42', 'en')).toBe('/en/tour/42')
    expect(inLanguage('/room/ABC123', 'it')).toBe('/it/room/ABC123')
  })
  it('replaces an existing supported prefix', () => {
    expect(inLanguage('/it/tour/42', 'en')).toBe('/en/tour/42')
    expect(inLanguage('/en', 'it')).toBe('/it')
  })
  it('leaves look-alike segments alone', () => {
    expect(inLanguage('/item/7', 'en')).toBe('/en/item/7')
  })
})
