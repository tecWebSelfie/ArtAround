import type { Route } from 'next'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Object as PayloadObject } from '@/payload-types'
import { LinkButton } from '@/components/editing/LinkButton'

import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

export const ObjectsSearchResults = async ({
  objects,
  lng,
}: {
  objects: readonly (string | PayloadObject | null | undefined)[] | null | undefined
  lng: string
}) => {
  const { t } = await getT('search')

  return (
    <SearchResultsGrid
      items={filterPopulated<PayloadObject>(objects)}
      getKey={(object) => object.id}
      emptyLabel={t('No objects found')}
      renderItem={(object) => {
        const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
        return (
          <SearchResultCard
            imageUrl={thumbnail?.url}
            imageAlt={thumbnail?.alt ?? object.name}
            title={object.name}
            description={object.description}
          >
            {/* LinkButton: a server component can't pass `Link` (a function) to Mantine's client Button. */}
            <LinkButton
              href={`/${lng}/object/${object.id}` as Route}
              size="compact-sm"
              variant="light"
              fullWidth
            >
              {t('View details')}
            </LinkButton>
          </SearchResultCard>
        )
      }}
    />
  )
}
