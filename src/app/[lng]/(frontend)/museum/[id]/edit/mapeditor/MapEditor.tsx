'use client'

import { ObjectCatalogPanel } from '@/components/pascal/ObjectCatalogPanel'
import { MuseumCreationToolbar } from '@/components/pascal/MuseumCreationToolbar'
import { museumPlugin } from '@/lib/pascal'
import { generateMuseumNavMeshesFromSceneRegistry } from '@/lib/pascal/utils'
import { payloadSdk } from '@/payload-sdk'
import { Box } from '@mantine/core'
import { loadPlugin, ParsedBuildJson } from '@pascal-app/core'
import { Editor } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Amphora } from 'lucide-react'
import { createNavMesh } from 'navcat'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const registerPlugin = loadPlugin(builtinPlugin)
const registerMuseumPlugin = loadPlugin(museumPlugin)

export function MapEditor({ museumId }: { museumId: string }) {
  const { t } = useTranslation('map-editor')
  const sceneReady = useRef<{ promise?: Promise<void>; resolve?: () => void }>({})
  const handleLoaderChange = useCallback((visible: boolean) => {
    if (visible) {
      sceneReady.current.promise ??= new Promise<void>((resolve) => {
        sceneReady.current.resolve = resolve
      })
    } else {
      sceneReady.current.resolve?.()
      sceneReady.current = {}
    }
  }, [])
  const {
    data: museum,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['museum', museumId],
    queryFn: async () =>
      payloadSdk.findByID({
        collection: 'museums',
        id: museumId,
      }),
  })

  const { mutateAsync } = useMutation({
    mutationKey: ['saveScene'],
    mutationFn: async (scene: ParsedBuildJson) => {
      // Scene JSON loads before the renderer has built navigation geometry.
      await sceneReady.current.promise
      const navMeshes = generateMuseumNavMeshesFromSceneRegistry()
      return payloadSdk.update({
        collection: 'museums',
        id: museumId,
        data: {
          map: scene,
          navMesh: navMeshes?.pedestrian ?? createNavMesh(),
          navMeshWheelchair: navMeshes?.wheelchair ?? createNavMesh(),
        },
      })
    },
  })

  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([registerPlugin, registerMuseumPlugin]).then(() => setReady(true))
  }, [])

  // Reuse the hydrated query result: a fresh `findByID` here would duplicate
  // the request and, with a new inline closure each render, retrigger the
  // editor's load effect (`[onLoad, …]`) in a loop.
  // Some stored maps have site-polygon points serialized as `{"0":x,"1":z}`
  // objects instead of `[x, z]` pairs (see museum 6ad215d05b159f24a7616019),
  // which crashes FloorplanPanel's `polygon.map(([x, z]) => …)` — normalize.
  const handleLoad = useCallback(async () => {
    const map = (museum?.map as ParsedBuildJson) ?? null
    if (!map) return null
    for (const node of Object.values(map.nodes ?? {})) {
      const polygon = (node as { polygon?: { points?: unknown } })?.polygon
      if (Array.isArray(polygon?.points)) {
        polygon.points = polygon.points.map((p) => (Array.isArray(p) ? p : [p?.[0], p?.[1]]))
      }
    }
    return map
  }, [museum?.map])

  if (!ready || isLoading) return <div>Loading...</div>
  if (isError || !museum) return <div>Error loading map</div>

  return (
    <Box className="h-dvh">
      <Editor
        sidebarTabs={[
          {
            id: 'items',
            label: t('Objects'),
            component: ObjectCatalogPanel,
            icon: <Amphora size={24} />,
          },
        ]}
        layoutVersion="v2"
        sceneOverlay={<MuseumCreationToolbar />}
        isLoading={false}
        onLoad={handleLoad}
        onLoaderChange={handleLoaderChange}
        onSave={async (scene) => {
          await mutateAsync(scene as ParsedBuildJson)
        }}
      />
    </Box>
  )
}
