import { formatDuration } from '@/lib/duration'
import { Badge, type BadgeProps } from '@mantine/core'
import { Clock } from 'lucide-react'

/**
 * Duration chip (DESIGN.md → Chips): a clock and a compact label (`15"`,
 * `1'30"`, `12'`, `src/lib/duration.ts`). Contents pass their exact length in
 * seconds; tours their visit length in minutes. Badge props pass through, so
 * compact lists can size it down.
 */
export const DurationBadge = ({
  seconds,
  ...props
}: { seconds: number } & Omit<BadgeProps, 'leftSection' | 'children'>) => {
  return (
    <Badge leftSection={<Clock size={props.size === 'xs' ? 12 : 16} aria-hidden />} {...props}>
      {formatDuration(seconds)}
    </Badge>
  )
}
