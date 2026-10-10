'use client'

import { ArtAroundGlobalSearch } from '@/components/mantine/ArtAroundGlobalSearch'
import { useListState } from '@mantine/hooks'

export function GlobalSearchBar() {
  const [] = useListState()

  return <ArtAroundGlobalSearch items={} onChange={() => {}} />
}
