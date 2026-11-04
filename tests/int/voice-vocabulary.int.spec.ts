import { describe, expect, it } from 'vitest'
import { matchControlledCommand, normalize, VOCABULARY } from '@/lib/voice-vocabulary'

/**
 * The controlled vocabulary of voice commands (requirement 7 of
 * `docs/plan/requisiti-18-33.md`): the specification's phrases map to their
 * commands without the language model, and only to commands available now.
 */
const ALL = VOCABULARY.map(({ command }) => command)

describe('controlled vocabulary', () => {
  it('normalizes accents, apostrophes and punctuation', () => {
    expect(normalize("Cos'è questo?")).toBe('cos e questo')
    expect(normalize('  Chi è l’autore?! ')).toBe('chi e l autore')
  })

  it.each([
    ['Avanti', 'next-stop'],
    ['Tappa precedente', 'previous-stop'],
    ["Cos'è questo?", 'what-is-this'],
    ['Dimmi di più', 'more:more'],
    ['Dimmi di meno', 'version:shorter'],
    ['Non ho capito', 'version:simpler'],
    ['Troppo semplice', 'version:harder'],
    ["Chi è l'autore?", 'author'],
    ['Qual è lo stile?', 'style'],
    ['Ci sono ostacoli?', 'wheelchair'],
    ["Dov'è l'uscita?", 'exit:nearest'],
    ["Dov'è il bagno?", 'service-type:bathrooms'],
    ["Dov'è il bar?", 'service-type:food'],
    ["Dov'è il negozio?", 'service-type:shop'],
    ['Who is the author?', 'author'],
    ['Per favore, avanti', 'next-stop'],
  ])('"%s" runs %s', (said, command) => {
    expect(matchControlledCommand(said, ALL)).toBe(command)
  })

  it('leaves other phrasings and unavailable commands to the model', () => {
    expect(
      matchControlledCommand('Mi racconti qualcosa di curioso su questo quadro?', ALL),
    ).toBeNull()
    // In free navigation there is no next stop.
    expect(
      matchControlledCommand(
        'Avanti',
        ALL.filter((id) => id !== 'next-stop'),
      ),
    ).toBeNull()
  })
})
