'use client'

import { museumPlugin } from '@/lib/pascal'
import { mockMuseumFull } from '@/mocks/museum.mock'
import { Museum } from '@/payload-types'
import { Box } from '@mantine/core'
import { loadPlugin, ParsedBuildJson } from '@pascal-app/core'
import { Editor, ItemsPanel } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const registerPlugin = loadPlugin(builtinPlugin)
const registerMuseumPlugin = loadPlugin(museumPlugin)

export function MapEditor({ museumId }: { museumId: Museum['id'] }) {
  const {
    data: museumMap,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['museumMap'],
    queryFn: () => mockMuseumFull.map,
  })

  const saveScene = useMutation({
    mutationKey: ['saveScene'],
    mutationFn: async (scene: ParsedBuildJson) => mockMuseumFull.map,
    onSuccess: async () => {
      refetch()
    },
  })

  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([registerPlugin, registerMuseumPlugin]).then(() => setReady(true))
  }, [])

  return ready ? (
    <Box className="h-dvh">
      {museumMap ? (
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
          onLoad={async () => museumMap as ParsedBuildJson}
        />
      ) : (
        <div>Error loading map</div>
      )}
    </Box>
  ) : (
    <div>Loading...</div>
  )
}
