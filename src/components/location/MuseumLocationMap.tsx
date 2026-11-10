'use client'

import { isMuseumPoint } from '@/lib/museum-location'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'

// MapLibre's WebGL canvas belongs on the client; saved postal metadata still renders server-side.
const Canvas = dynamic(() => import('./MuseumLocationMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-(--mantine-radius-default) bg-(--mantine-color-default)" />
  ),
})

/** Shared one-pin preview for director editing and public museum information, without GPS requests. */
export function MuseumLocationMap({ point }: { point: unknown }) {
  const { t } = useTranslation('editing')
  if (!isMuseumPoint(point)) return <p>{t('The museum position has not been set.')}</p>
  return <Canvas point={point} />
}
