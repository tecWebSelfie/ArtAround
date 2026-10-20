'use client'

import { ObjectCatalogPanel, useObjectGeneration } from '@/components/pascal/ObjectCatalogPanel'
import { MuseumCreationToolbar } from '@/components/pascal/MuseumCreationToolbar'
import { MuseumServicesPanel } from '@/components/pascal/MuseumServicesPanel'
import { MuseumServicesToolbar } from '@/components/pascal/MuseumServicesToolbar'
import { museumPlugin } from '@/lib/pascal'
import { CREATE_PARAM, PLACE_PARAM } from '@/lib/museum-picker'
import {
  EditorMuseumContext,
  EditorViewerContext,
  type EditorViewer,
} from '@/lib/pascal/editor-viewer'
import { placeableObjectAsset } from '@/lib/pascal/object-assets'
import { generateMuseumNavMeshesFromSceneRegistry } from '@/lib/pascal/utils'
import { payloadSdk } from '@/payload-sdk'
import { Box } from '@mantine/core'
import { loadPlugin, ParsedBuildJson } from '@pascal-app/core'
import { activateCatalogItem, Editor } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Amphora, Toilet } from 'lucide-react'
import { createNavMesh } from 'navcat'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

const registerPlugin = loadPlugin(builtinPlugin)
const registerMuseumPlugin = loadPlugin(museumPlugin)

export function MapEditor({
  museumId,
  canManageStructure,
  viewer,
}: {
  museumId: string
  /** Signed-in editor, shared with Pascal-mounted panels via `EditorViewerContext`. */
  viewer: EditorViewer
  /**
   * Director (or super admin): building construction, services and
   * entrances/exits. Curators only place catalog objects; the server rejects
   * any other scene change (`guardCuratorMapEdits`), so hiding the tools here
   * is a convenience, not the enforcement.
   */
  canManageStructure: boolean
}) {
  const { t } = useTranslation('map-editor')
  const sceneReady = useRef<{ promise?: Promise<void>; resolve?: () => void }>({})
  // True once the stored scene is on screen: the moment an object from the
  // objects search (`?place=`) can be put in hand.
  const [sceneLoaded, setSceneLoaded] = useState(false)
  const handleLoaderChange = useCallback((visible: boolean) => {
    if (visible) {
      sceneReady.current.promise ??= new Promise<void>((resolve) => {
        sceneReady.current.resolve = resolve
      })
    } else {
      sceneReady.current.resolve?.()
      sceneReady.current = {}
      setSceneLoaded(true)
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
    if (!map) {
      // Nothing to load, so no loader cycle will report it.
      setSceneLoaded(true)
      return null
    }
    for (const node of Object.values(map.nodes ?? {})) {
      const polygon = (node as { polygon?: { points?: unknown } })?.polygon
      if (Array.isArray(polygon?.points)) {
        polygon.points = polygon.points.map((p) => (Array.isArray(p) ? p : [p?.[0], p?.[1]]))
      }
    }
    return map
  }, [museum?.map])

  // Arrival from the objects search (`src/lib/museum-picker.ts`): put the
  // picked object in hand (`?place=`), or open the new-object modal
  // (`?create=1`). Handled once, then the params are dropped so a reload
  // doesn't repeat it: with `history.replaceState`, never `router.replace`,
  // which re-renders the server page, refreshes the museum query and makes
  // Pascal reload the scene (back to select mode, unsaved edits gone).
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const openGeneration = useObjectGeneration()
  const arrivalHandled = useRef(false)
  useEffect(() => {
    const place = searchParams.get(PLACE_PARAM)
    const create = searchParams.get(CREATE_PARAM) === '1'
    if (!sceneLoaded || arrivalHandled.current || (!place && !create)) return
    arrivalHandled.current = true
    window.history.replaceState(null, '', pathname)
    if (create) openGeneration()
    if (place) {
      // Same read as the catalog panel (`objectLibraryOptions`): depth 2
      // reaches the model file the placeable asset points at.
      payloadSdk
        .findByID({ collection: 'objects', id: place, depth: 2, locale: 'en' })
        .then((object) => activateCatalogItem(placeableObjectAsset(object)))
        .catch(() => {
          // A stale or foreign id: the editor simply opens without an object in hand.
        })
    }
  }, [sceneLoaded, searchParams, pathname, openGeneration])

  if (!ready || isLoading) return <div>Loading...</div>
  if (isError || !museum) return <div>Error loading map</div>

  return (
    <EditorMuseumContext.Provider value={museumId}>
      <EditorViewerContext.Provider value={viewer}>
        <Box className="h-dvh">
          <Editor
            sidebarTabs={[
              {
                id: 'items',
                label: t('Objects'),
                component: ObjectCatalogPanel,
                icon: <Amphora size={24} />,
              },
              ...(canManageStructure
                ? [
                    {
                      id: 'services',
                      label: t('Services'),
                      component: MuseumServicesPanel,
                      icon: <Toilet size={24} />,
                    },
                  ]
                : []),
            ]}
            layoutVersion="v2"
            sceneOverlay={
              // Left: map construction. Right: museum service markers. Both are director tools.
              canManageStructure ? (
                <>
                  <MuseumCreationToolbar />
                  <MuseumServicesToolbar />
                </>
              ) : null
            }
            isLoading={false}
            onLoad={handleLoad}
            onLoaderChange={handleLoaderChange}
            onSave={async (scene) => {
              await mutateAsync(scene as ParsedBuildJson)
            }}
          />
        </Box>
      </EditorViewerContext.Provider>
    </EditorMuseumContext.Provider>
  )
}
