import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Tour } from '@/payload-types'

import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

export const ToursSearchResults = async ({
  tours,
}: {
  tours: readonly (string | Tour | null | undefined)[] | null | undefined
}) => {
  const { t } = await getT('search')

  return (
    <SearchResultsGrid
      items={filterPopulated<Tour>(tours)}
      getKey={(tour) => tour.id}
      emptyLabel={t('No visits found')}
      renderItem={(tour) => {
        const thumbnail = isPopulated(tour.thumbnail) ? tour.thumbnail : null
        return (
          <SearchResultCard
            imageUrl={thumbnail?.url}
            imageAlt={thumbnail?.alt ?? tour.title}
            title={tour.title}
            description={tour.description}
          />
        )
      }}
    />
  )
}
