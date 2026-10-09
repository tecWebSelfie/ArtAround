import { Badge } from '@mantine/core'
import { Clock } from 'lucide-react'

export const DurationBadge = ({ time }: { time: number }) => {
  return <Badge leftSection={<Clock size={16} />}>{`${time}'`}</Badge>
}
