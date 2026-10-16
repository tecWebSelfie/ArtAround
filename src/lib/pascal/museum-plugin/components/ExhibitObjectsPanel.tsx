import { payloadSdk } from '@/payload-sdk'
import { Button, EmptyState, Stack } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { SquareDashedPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { ExhibitNode } from '../ExhibitNode'

export function ExhibitObjectsPanel({ node }: { node: z.infer<typeof ExhibitNode> }) {
  const museumObjectsIds = node.museumObjectsIds || []
  const { t } = useTranslation('museum-plugin')

  const {
    data: objects,
    status,
    refetch,
  } = useQuery({
    queryKey: ['museumObjects'],
    queryFn: () =>
      payloadSdk.find({
        collection: 'objects',
        where: {
          id: { in: museumObjectsIds },
        },
      }),
  })

  return (
    <Stack>
      {status === 'pending' && <div>Loading...</div>}
      {status === 'error' && (
        <EmptyState
          title={t('Error loading objects')}
          description={t('There was an error loading the objects for this exhibit.')}
        >
          <Button onClick={async () => refetch()}>{t('Retry')}</Button>{' '}
        </EmptyState>
      )}
      {status === 'success' && objects && objects?.docs.length > 0 ? (
        <div>Objects found</div>
      ) : (
        <EmptyState
          icon={<SquareDashedPlus />}
          title={t('No objects in this exhibit')}
          description={t('Add objects to this exhibit to display them here.')}
        >
          <Button>{t('Add Object')}</Button>
        </EmptyState>
      )}
    </Stack>
  )
}
