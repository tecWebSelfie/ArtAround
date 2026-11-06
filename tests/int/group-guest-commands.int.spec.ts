import { describe, expect, it } from 'vitest'
import { guestCommands } from '@/lib/group'

/**
 * What a student can do during a synchronized tour (course brief, Navigator
 * 18-27): "in front of every work the teacher starts the right description.
 * The student can ask for deeper explanations or a different language, but
 * not go forward or back." The seam is the rule that trims the navigation
 * commands (buttons, Spotlight and voice share them) for a group guest.
 */
const ids = (commands: { id: string }[]) => commands.map(({ id }) => id)

const TOUR_COMMANDS = [
  'next-stop',
  'previous-stop',
  'what-is-this',
  'author',
  'style',
  'more:more',
  'more:story',
  'version:simpler',
  'version:harder',
  'version:shorter',
  'wheelchair',
].map((id) => ({ id }))

describe('commands of a group guest', () => {
  it('never lets a guest move the tour forward or back', () => {
    const kept = ids(guestCommands(TOUR_COMMANDS))
    expect(kept).not.toContain('next-stop')
    expect(kept).not.toContain('previous-stop')
  })

  it('keeps deeper explanations, other reading levels and questions about the work', () => {
    expect(ids(guestCommands(TOUR_COMMANDS))).toEqual([
      'what-is-this',
      'author',
      'style',
      'more:more',
      'more:story',
      'version:simpler',
      'version:harder',
      'version:shorter',
      'wheelchair',
    ])
  })
})
