'use client'

import { Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/**
 * What a museum map shows while it loads (viewer code, map data, then the 3D
 * scene until the camera frames it): a museum that builds itself, its columns
 * rising one by one under the pediment, on the page's own surface. It fills
 * its box; `MapViewer` keeps it under the canvas, which fades in over it.
 * The drawing is lucide's `Landmark`, split into parts so each can move; the
 * motion lives in `globals.css` (`.map-loading`) and stops for reduced motion.
 */
export function MapLoading() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="map-loading flex size-full flex-col items-center justify-center gap-(--mantine-spacing-sm) bg-(--mantine-color-body)"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        // The museum's primary in museum mode; its .4 step on the dark page,
        // where the filled step fades (DESIGN.md → Follow-the-System Rule).
        className="size-14 text-[light-dark(var(--mantine-primary-color-filled),var(--mantine-primary-color-4))]"
      >
        <path d="M3 22h18" />
        <path className="map-loading-column" d="M6 18v-7" />
        <path className="map-loading-column" d="M10 18v-7" />
        <path className="map-loading-column" d="M14 18v-7" />
        <path className="map-loading-column" d="M18 18v-7" />
        <path
          className="map-loading-roof"
          d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"
        />
      </svg>
      <Text size="sm" c="dimmed">
        {t('Loading map…')}
      </Text>
    </div>
  )
}
