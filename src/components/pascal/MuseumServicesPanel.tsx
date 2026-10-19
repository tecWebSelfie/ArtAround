'use client'

import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import { collectMuseumMarkers, type ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_NODE_TYPE, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import { useMuseumMarkersStore } from '@/lib/pascal/museum-plugin/services-store'
import {
  ActionIcon,
  Badge,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { armToolMode, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { MapPinPlus, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ServiceOpeningHoursField } from '@/lib/pascal/museum-plugin/components/ServiceOpeningHoursField'
import styles from './museum-services-panel.module.css'

/**
 * Services sidebar panel. Lists every service already present in the museum
 * map (they can be authored outside the editor), highlights the ones still
 * missing a position, and reuses the inspector's opening-hours field for the
 * modal editor. Placed markers use Pascal's generic move flow; new or legacy
 * unplaced services use the shared marker tool for their first placement.
 */
export function MuseumServicesPanel() {
  const { t } = useTranslation('map-editor')
  // Literal `t()` calls (not a dynamic key) so the labels are extractable.
  const serviceLabel: Record<ServiceType, string> = {
    bathrooms: t('Toilets'),
    food: t('Food'),
    infoPoint: t('Info point'),
    shop: t('Shop'),
  }
  const nodes = useScene((state) => state.nodes)
  const levelId = useViewer((state) => state.selection.levelId)
  const selectedService = useMuseumMarkersStore((state) => state.selectedService)
  const selectService = useMuseumMarkersStore((state) => state.selectService)

  // The toolbar owns type selection; deriving and ordering the visible nodes in
  // one memo keeps the panel focused on the current service category.
  const ordered = useMemo(
    () =>
      collectMuseumMarkers(nodes as unknown as Record<string, unknown>)
        .services.filter((service) => !selectedService || service.service === selectedService)
        // Unplaced services need attention first: they cannot be routed to yet.
        .sort((a, b) => Number(a.placed) - Number(b.placed)),
    [nodes, selectedService],
  )

  const placeOrMoveService = (marker: ServiceMarker) => {
    const node = useScene.getState().nodes[marker.id as AnyNodeId]
    if (!node) return
    if (marker.placed) {
      // Pascal owns surface-aware repositioning once a marker has coordinates.
      useEditor.getState().setMovingNode(node)
    } else {
      // A legacy service has no valid starting position for the generic mover.
      useEditor.getState().setToolDefaults(SERVICE_NODE_TYPE, {
        nodeId: marker.id,
        service: marker.service,
      })
      armToolMode({ mode: 'build', tool: SERVICE_NODE_TYPE })
    }
  }

  const createService = () => {
    const type = selectedService ?? 'infoPoint'
    useEditor.getState().setToolDefaults(SERVICE_NODE_TYPE, { service: type })
    armToolMode({ mode: 'build', tool: SERVICE_NODE_TYPE })
  }

  const updateService = (nodeId: string, patch: Partial<ServiceMarker>) => {
    useScene.getState().updateNode(nodeId as AnyNodeId, patch as Partial<AnyNode>)
  }

  const removeService = (nodeId: string) => {
    useScene.getState().deleteNode(nodeId as AnyNodeId)
  }

  return (
    <Stack gap="xs" p="sm" className="h-full overflow-hidden">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} size="sm">
          {t('Services')}
        </Text>
        <Tooltip label={t('Add a service')}>
          <ActionIcon
            aria-label={t('Add a service')}
            disabled={!levelId}
            variant="default"
            onClick={createService}
          >
            <Plus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider />

      <Stack gap="xs" className={styles.rows}>
        {ordered.length === 0 && (
          <Text c="dimmed" size="sm">
            {t('No services yet. Add one and place it on the map.')}
          </Text>
        )}
        {ordered.map((node) => {
          const meta = SERVICE_META[node.service]
          return (
            <Card
              key={node.id}
              withBorder
              padding="sm"
              radius="md"
              className={node.placed ? undefined : styles.unplaced}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap" align="center">
                  <Group gap="xs" wrap="nowrap" align="center">
                    <Tooltip
                      label={
                        node.placed
                          ? t('Move this service on the map')
                          : t('Place this service on the map')
                      }
                    >
                      <ActionIcon
                        aria-label={
                          node.placed
                            ? t('Move this service on the map')
                            : t('Place this service on the map')
                        }
                        color={meta.color}
                        radius="xl"
                        size="lg"
                        variant={node.placed ? 'light' : 'filled'}
                        disabled={!levelId}
                        onClick={() => placeOrMoveService(node)}
                      >
                        {node.placed ? <MapPinPlus size={18} /> : <meta.Icon size={18} />}
                      </ActionIcon>
                    </Tooltip>
                    <Stack gap={2}>
                      <Text fw={500} size="sm">
                        {node.name ?? serviceLabel[node.service]}
                      </Text>
                      {!node.placed && (
                        <Badge color="yellow" size="xs" variant="light">
                          {t('Not placed')}
                        </Badge>
                      )}
                    </Stack>
                  </Group>
                  <Tooltip label={t('Remove this service')}>
                    <ActionIcon
                      aria-label={t('Remove this service')}
                      color="red"
                      size="sm"
                      variant="subtle"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeService(node.id)
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <ServiceOpeningHoursField
                  node={node}
                  onUpdate={(patch) => updateService(node.id, patch)}
                />
              </Stack>
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}
