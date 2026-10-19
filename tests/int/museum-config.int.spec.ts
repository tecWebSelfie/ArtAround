import { describe, expect, it } from 'vitest'
import { parseMuseumConfig } from '@/lib/museum-config'

// Museum config files are Payload import/export plugin exports (src/lib/museum-config.ts).
describe('parseMuseumConfig', () => {
  it('reads the first museum of a JSON export', () => {
    const json = JSON.stringify([{ id: '6ad52a1a0ab7c42772812c43', name: 'Galleria Borghese' }])
    expect(parseMuseumConfig(json)).toEqual({
      id: '6ad52a1a0ab7c42772812c43',
      name: 'Galleria Borghese',
    })
  })

  it('reads id and name columns of a CSV export, quoted cells included', () => {
    const csv = 'name,id,location_city\n"Museo, Torino",6ad52a1a0ab7c42772812c43,Torino\n'
    expect(parseMuseumConfig(csv)).toEqual({
      id: '6ad52a1a0ab7c42772812c43',
      name: 'Museo, Torino',
    })
  })

  it('rejects files that describe no museum', () => {
    expect(parseMuseumConfig('not a config')).toBeNull()
    expect(parseMuseumConfig('[]')).toBeNull()
  })
})
