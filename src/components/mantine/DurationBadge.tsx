import { formatDuration } from '@/lib/duration'
import { Badge, type BadgeProps } from '@mantine/core'
import { Clock } from 'lucide-react'

/**
 * Duration chip (DESIGN.md → Chips): a clock and a localized label ("15 sec",
 * "1 min 30 sec", "12 min"; `formatDuration` in `src/lib/duration.ts`), so it
 * takes the page language. Contents pass their exact length in seconds; tours
 * their visit length in minutes. Badge props pass through, so compact lists
 * can size it down.
 */
export const DurationBadge = ({
  seconds,
  lng,
  ...props
}: { seconds: number; lng: string } & Omit<BadgeProps, 'leftSection' | 'children'>) => {
  return (
    // Not upper-cased like other chips: unit symbols change meaning with
    // case ("2 s" is seconds, "2 S" is not), so the label keeps its own.
    <Badge
      leftSection={<Clock size={props.size === 'xs' ? 12 : 16} aria-hidden />}
      tt="none"
      {...props}
    >
      {formatDuration(seconds, lng)}
    </Badge>
  )
}
