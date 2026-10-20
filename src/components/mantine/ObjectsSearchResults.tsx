import type { Route } from 'next'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { placeOnMapHref, type MuseumPicker } from '@/lib/museum-picker'
import type { Object as PayloadObject } from '@/payload-types'
import { LinkButton } from '@/components/editing/LinkButton'
import { Badge, Group } from '@mantine/core'
import { Check, MapPin } from 'lucide-react'

import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

/**
 * Objects search results. With a `picker` (the map editor's "Browse the
 * catalog", `src/lib/museum-picker.ts`) each card leads with its museum
 * action: "Place on the map" back to the editor with the object in hand, or a
 * static "On show" for objects the museum's map already exhibits.
 */
export const ObjectsSearchResults = async ({
  objects,
  lng,
  picker,
  onShow,
}: {
  objects: readonly (string | PayloadObject | null | undefined)[] | null | undefined
  lng: string
  picker?: MuseumPicker | null
  /** Ids of the objects already placed on the museum's map. */
  onShow?: ReadonlySet<string>
}) => {
  const { t } = await getT('search')

  return (
    <SearchResultsGrid
      items={filterPopulated<PayloadObject>(objects)}
      getKey={(object) => object.id}
      emptyLabel={t('No objects found')}
      renderItem={(object) => {
        const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
        // LinkButton everywhere: a server component can't pass `Link` (a
        // function) to Mantine's client Button.
        const details = (
          <LinkButton
            href={`/${lng}/object/${object.id}` as Route}
            size="compact-sm"
            variant={picker ? 'subtle' : 'light'}
            fullWidth={!picker}
          >
            {t('View details')}
          </LinkButton>
        )
        return (
          <SearchResultCard
            imageUrl={thumbnail?.url}
            imageAlt={thumbnail?.alt ?? object.name}
            title={object.name}
            description={object.description}
          >
            {picker ? (
              <Group justify="space-between" gap="xs" mt="xs">
                {onShow?.has(object.id) ? (
                  <Badge
                    variant="light"
                    color="teal"
                    size="lg"
                    leftSection={<Check size={14} aria-hidden />}
                  >
                    {t('On show')}
                  </Badge>
                ) : (
                  <LinkButton
                    href={placeOnMapHref(picker, object.id) as Route}
                    leftSection={<MapPin size={16} aria-hidden />}
                    aria-label={t('Place {{name}} on the map', { name: object.name })}
                  >
                    {t('Place on the map')}
                  </LinkButton>
                )}
                {details}
              </Group>
            ) : (
              details
            )}
          </SearchResultCard>
        )
      }}
    />
  )
}
