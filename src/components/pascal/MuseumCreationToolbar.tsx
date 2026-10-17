'use client'

import { payloadSdk } from '@/payload-sdk'
import { ActionIcon, FileButton, Paper, Tooltip } from '@mantine/core'
import { GuideNode, useScene } from '@pascal-app/core'
import { armToolMode, showSidebarPanel, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMutation } from '@tanstack/react-query'
import {
  Amphora,
  AppWindow,
  BrickWall,
  DoorOpen,
  ImageUp,
  Layers,
  MousePointer2,
} from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './museum-creation-toolbar.module.css'

export function MuseumCreationToolbar() {
  const { t } = useTranslation('map-editor')
  const buildingTools = [
    { tool: 'wall', label: t('Draw walls'), Icon: BrickWall },
    { tool: 'slab', label: t('Draw a slab'), Icon: Layers },
    { tool: 'door', label: t('Add a door'), Icon: DoorOpen },
    { tool: 'window', label: t('Add a window'), Icon: AppWindow },
  ] as const
  const levelId = useViewer((state) => state.selection.levelId)
  const readOnly = useScene((state) => state.readOnly)
  const toolMode = useEditor((state) => state.toolMode)
  const hidden = useEditor(
    (state) => state.isPreviewMode || state.isCaptureMode || state.workspaceMode !== 'edit',
  )
  const resetFile = useRef<() => void>(null)
  const floorplan = useMutation({
    mutationFn: async (file: File) => {
      if (!levelId) throw new Error('No active level')
      const upload = await payloadSdk.create({ collection: 'museumMaps', data: {}, file })
      if (!upload.url) throw new Error('Upload did not return a file URL')
      const guide = GuideNode.parse({
        name: file.name,
        parentId: levelId,
        url: new URL(upload.url, payloadSdk.baseURL).href,
      })
      useScene.getState().createNode(guide, levelId)
      return guide
    },
    onSuccess: (guide) => {
      armToolMode({ mode: 'select' })
      useViewer.getState().setShowGuides(true)
      if (useViewer.getState().selection.levelId === guide.parentId) {
        useViewer.getState().setSelection({ selectedIds: [], zoneId: null })
        useEditor.getState().setSelectedReferenceId(guide.id)
      }
    },
    onSettled: () => resetFile.current?.(),
  })

  if (readOnly || hidden) return null

  return (
    <Paper className={styles.toolbar} role="group" aria-label={t('Museum creation tools')}>
      <Tooltip label={t('Select objects')} position="right">
        <ActionIcon
          aria-label={t('Select objects')}
          aria-pressed={toolMode.mode === 'select'}
          variant={toolMode.mode === 'select' ? 'light' : 'default'}
          size={44}
          type="button"
          onClick={() => armToolMode({ mode: 'select' })}
        >
          <MousePointer2 size={20} />
        </ActionIcon>
      </Tooltip>
      {buildingTools.map(({ tool, label, Icon }) => (
        <Tooltip key={tool} label={label} position="right">
          <ActionIcon
            aria-label={label}
            aria-pressed={toolMode.mode === 'build' && toolMode.tool === tool}
            variant={toolMode.mode === 'build' && toolMode.tool === tool ? 'light' : 'default'}
            size={44}
            type="button"
            disabled={!levelId}
            onClick={() => armToolMode({ mode: 'build', tool })}
          >
            <Icon size={20} />
          </ActionIcon>
        </Tooltip>
      ))}
      <FileButton
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        disabled={!levelId || floorplan.isPending}
        resetRef={resetFile}
        inputProps={{ 'aria-label': t('Choose a floorplan file') }}
        onChange={(file) => {
          if (file) floorplan.mutate(file)
        }}
      >
        {(props) => (
          <Tooltip label={t('Add a floorplan (SVG or image)')} position="right">
            <ActionIcon
              {...props}
              aria-label={t('Add a floorplan (SVG or image)')}
              variant="default"
              size={44}
              type="button"
              disabled={!levelId}
              loading={floorplan.isPending}
            >
              <ImageUp size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </FileButton>
      <Tooltip label={t('Add object to the map')} position="right">
        <ActionIcon
          aria-label={t('Add object to the map')}
          variant="default"
          size={44}
          type="button"
          disabled={!levelId}
          onClick={() => {
            armToolMode({ mode: 'select' })
            showSidebarPanel('items')
          }}
        >
          <Amphora size={20} />
        </ActionIcon>
      </Tooltip>
      {floorplan.isError ? (
        <p role="alert">{t('Could not upload the floorplan. Try again.')}</p>
      ) : null}
    </Paper>
  )
}
