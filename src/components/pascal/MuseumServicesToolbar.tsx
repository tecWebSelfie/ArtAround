'use client'

import { EXIT_ENTRANCE_NODE_TYPE } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import type { ExitEntranceDirection } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { EXIT_ENTRANCE_META, SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import { SERVICE_NODE_TYPE, SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import { useMuseumMarkersStore } from '@/lib/pascal/museum-plugin/services-store'
import { ActionIcon, Divider, Paper, Tooltip } from '@mantine/core'
import { useScene } from '@pascal-app/core'
import { armToolMode, showSidebarPanel, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useTranslation } from 'react-i18next'
import styles from './museum-services-toolbar.module.css'

/**
 * Right-hand canvas toolbar for museum markers. Service icons open the services
 * sidebar panel (services can be authored elsewhere, so the panel lists what is
 * already in the map); entrance/exit icons arm the shared marker placement tool
 * so staff draw them directly on the map.
 */
export function MuseumServicesToolbar() {
  const { t } = useTranslation('map-editor')
  // Literal `t()` calls (not `t(\`service.${type}\`)`) so `i18next-cli extract`
  // sees every label; the type-keyed lookup is only used for rendering.
  const serviceLabel: Record<ServiceType, string> = {
    bathrooms: t('Toilets'),
    food: t('Food'),
    infoPoint: t('Info point'),
    shop: t('Shop'),
  }
  const markerLabel: Record<ExitEntranceDirection, string> = {
    entrance: t('Entrance'),
    exit: t('Exit'),
  }
  const levelId = useViewer((state) => state.selection.levelId)
  const readOnly = useScene((state) => state.readOnly)
  const toolMode = useEditor((state) => state.toolMode)
  const hidden = useEditor(
    (state) => state.isPreviewMode || state.isCaptureMode || state.workspaceMode !== 'edit',
  )
  const selectedService = useMuseumMarkersStore((state) => state.selectedService)
  const selectService = useMuseumMarkersStore((state) => state.selectService)

  if (readOnly || hidden) return null

  /** Arm the marker tool with per-kind defaults (see `MarkerPlacementTool`). */
  const armMarker = (kind: string, defaults: Record<string, unknown>) => {
    useEditor.getState().setToolDefaults(kind, defaults)
    armToolMode({ mode: 'build', tool: kind })
  }

  return (
    <Paper className={styles.toolbar} role="group" aria-label={t('Museum services')}>
      {SERVICE_TYPES.map((type) => {
        const { Icon, color } = SERVICE_META[type]
        return (
          <Tooltip key={type} label={serviceLabel[type]} position="left">
            <ActionIcon
              aria-label={serviceLabel[type]}
              aria-pressed={selectedService === type}
              color={color}
              variant={selectedService === type ? 'light' : 'default'}
              size={44}
              type="button"
              onClick={() => {
                // The active service icon filters the panel; clicking it again
                // clears the filter so staff can return to the full list.
                selectService(selectedService === type ? null : type)
                armToolMode({ mode: 'select' })
                showSidebarPanel('services')
              }}
            >
              <Icon size={20} />
            </ActionIcon>
          </Tooltip>
        )
      })}
      <Divider />
      {(['entrance', 'exit'] as const).map((direction) => {
        const { Icon, color } = EXIT_ENTRANCE_META[direction]
        const armed = toolMode.mode === 'build' && toolMode.tool === EXIT_ENTRANCE_NODE_TYPE
        return (
          <Tooltip key={direction} label={markerLabel[direction]} position="left">
            <ActionIcon
              aria-label={markerLabel[direction]}
              aria-pressed={armed}
              color={color}
              variant={armed ? 'light' : 'default'}
              size={44}
              type="button"
              disabled={!levelId}
              onClick={() => armMarker(EXIT_ENTRANCE_NODE_TYPE, { direction })}
            >
              <Icon size={20} />
            </ActionIcon>
          </Tooltip>
        )
      })}
    </Paper>
  )
}
