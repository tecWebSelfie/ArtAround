import { Badge, type BadgeProps } from '@mantine/core'
import { Clock } from 'lucide-react'

/**
 * Duration chip (DESIGN.md → Chips): a clock and a compact minute label
 * (`12'`). Badge props pass through, so compact lists can size it down.
 */
export const DurationBadge = ({
  time,
  ...props
}: { time: number } & Omit<BadgeProps, 'leftSection' | 'children'>) => {
  return (
    <Badge leftSection={<Clock size={props.size === 'xs' ? 12 : 16} aria-hidden />} {...props}>
      {`${time}'`}
    </Badge>
  )
}
