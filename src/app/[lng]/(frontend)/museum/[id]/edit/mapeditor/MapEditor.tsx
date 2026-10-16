'use client'

import { museumPlugin } from '@/lib/pascal'
import { mockMuseumFull } from '@/mocks/museum.mock'
import { payloadSdk } from '@/payload-sdk'
import { Box } from '@mantine/core'
import { loadPlugin, ParsedBuildJson } from '@pascal-app/core'
import { Editor, ItemsPanel } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const registerPlugin = loadPlugin(builtinPlugin)
const registerMuseumPlugin = loadPlugin(museumPlugin)

export function MapEditor({ museumId }: { museumId: string }) {
  const { data: museum, isLoading } = useQuery({
    queryKey: ['museum', museumId],
    queryFn: async () =>
      payloadSdk.update({
        collection: 'museums',
        id: museumId,
        data: {
          map: mockMuseumFull.map,
        },
      }),
  })

  const saveScene = useMutation({
    mutationKey: ['saveScene'],
    mutationFn: (scene: ParsedBuildJson) =>
      payloadSdk.update({
        collection: 'museums',
        id: museumId,
        data: {
          map: scene,
        },
      }),
  })

  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([registerPlugin, registerMuseumPlugin]).then(() => setReady(true))
  }, [])

  return ready ? (
    <Box className="h-dvh">
      {museum ? (
        <Editor
          sidebarTabs={[
            {
              id: 'items',
              label: 'Items',
              component: ItemsPanel,
            },
          ]}
          layoutVersion="v2"
          isLoading={isLoading}
          onLoad={async () => (museum?.map as ParsedBuildJson) ?? null}
        />
      ) : (
        <div>Error loading map</div>
      )}
    </Box>
  ) : (
    <div>Loading...</div>
  )
}
