'use client'

import dynamic from 'next/dynamic'
import { useGroup } from './GroupProvider'

// The pill and its panel use LiveKit hooks: loaded only once this device is in
// a group, so the tour map doesn't download LiveKit for visitors touring alone.
const GroupBadgePanel = dynamic(() => import('./GroupBadgePanel'), { ssr: false })

/**
 * The group's presence during the tour: a small pill in the tour header that
 * opens the group panel (GroupBadgePanel). Renders nothing when touring alone
 * (or in a story without GroupProvider).
 */
export function GroupBadge() {
  return useGroup() ? <GroupBadgePanel /> : null
}
