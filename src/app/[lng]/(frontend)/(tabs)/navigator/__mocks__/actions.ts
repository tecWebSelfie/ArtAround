import type { RailMuseum } from '@/lib/discover'
import { fn } from 'storybook/test'

/**
 * Storybook stand-in for the navigator's Server Actions (registered with
 * `sb.mock` in .storybook/preview.tsx): the real module reads Payload on
 * the server. `museumsNear` answers two Bologna museums, nearest first.
 */
export const NEAR_BOLOGNA: RailMuseum[] = [
  {
    id: 'near-1',
    name: 'Pinacoteca Nazionale di Bologna',
    city: 'Bologna',
    imageUrl: null,
    point: [11.3519, 44.4999],
    color: '#7c3aed',
  },
  {
    id: 'near-2',
    name: 'Museo Galileo',
    city: 'Firenze',
    imageUrl: null,
    point: [11.2559, 43.7678],
    color: null,
  },
]

export const museumsNear = fn(async () => NEAR_BOLOGNA).mockName('museumsNear')
