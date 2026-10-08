import { type Difficulty } from '@/fields/DifficultyField'
import { Badge, type BadgeProps } from '@mantine/core'
import { Flame, Gauge, Leaf } from 'lucide-react'
import type { ReactNode } from 'react'

export type { Difficulty }

// Teal identity: tours are purple/orange, objects are plain, contents are teal.
export const DIFFICULTY_META = {
  easy: { icon: Leaf, color: 'green' },
  medium: { icon: Gauge, color: 'yellow' },
  hard: { icon: Flame, color: 'red.9' },
} as const satisfies Record<Difficulty, { icon: typeof Leaf; color: string }>

export const DIFFICULTY_LABEL_KEY = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
} as const satisfies Record<Difficulty, string>

export type DifficultyBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  difficulty: Difficulty
  children?: ReactNode
}

export function DifficultyBadge({
  difficulty,
  children,
  size = 'sm',
  variant = 'filled',
  autoContrast = true,
  ...props
}: DifficultyBadgeProps) {
  const meta = DIFFICULTY_META[difficulty]
  const DifficultyIcon = meta.icon

  return (
    <Badge
      size={size}
      variant={variant}
      autoContrast={autoContrast}
      color={meta.color}
      leftSection={<DifficultyIcon size={14} />}
      {...props}
    >
      {children ?? DIFFICULTY_LABEL_KEY[difficulty]}
    </Badge>
  )
}
