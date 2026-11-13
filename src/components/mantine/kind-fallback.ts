import { BookOpen, Map, UserRound } from 'lucide-react'

/**
 * What a document without artwork shows instead of a grey placeholder: its
 * kind's identity gradient with the kind's mark (DESIGN.md → Placeholder
 * image). Shared by the marketplace cards, the detail-page covers and the
 * tour start page, so each kind looks the same wherever its picture is missing.
 */
export const KIND_FALLBACK = {
  tour: {
    // The shared tour tokens (globals.css), blended in OKLCH.
    background: 'linear-gradient(in oklch 135deg, var(--tour-from), var(--tour-to))',
    Icon: Map,
  },
  content: {
    background: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-cyan-4))',
    Icon: BookOpen,
  },
  user: {
    background:
      'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-4))',
    Icon: UserRound,
  },
} as const
