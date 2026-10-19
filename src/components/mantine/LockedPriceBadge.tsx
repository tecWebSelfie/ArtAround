'use client'

import { formatPrice } from '@/lib/price'
import { Badge, type BadgeProps } from '@mantine/core'
import { Lock } from 'lucide-react'
import { useParams } from 'next/navigation'

/**
 * The "locked price" element from DESIGN.md: a light paid-orange badge with a
 * leading `Lock` and the formatted price, shown next to a paid content the
 * visitor cannot read yet (tour pages, navigation search, nearby suggestions).
 * Icon + label, never color alone: the info-point service shares the orange.
 */
export function LockedPriceBadge({ price, ...props }: { price: number } & BadgeProps) {
  const { lng } = useParams<{ lng: string }>()
  return (
    <Badge variant="light" color="orange" leftSection={<Lock size={12} />} {...props}>
      {formatPrice(price, lng)}
    </Badge>
  )
}
