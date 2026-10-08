import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Tour } from '@/payload-types'
import { Card, Grid, Image, Stack, Text } from '@mantine/core'

const PLACEHOLDER = 'https://placehold.co/600x400?text=Placeholder'

export const ToursSearchResults = async ({
  tours,
}: {
  tours: readonly (string | Tour | null | undefined)[] | null | undefined
}) => {
  const { t } = await getT('search')
  const validTours = filterPopulated<Tour>(tours)

  if (validTours.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('No visits found')}
      </Text>
    )
  }

  return (
    <Grid>
      {validTours.map((tour) => {
        const thumbnail = isPopulated(tour.thumbnail) ? tour.thumbnail : null
        return (
          <Grid.Col key={tour.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="sm" radius="md" withBorder>
              <Card.Section>
                <Image
                  h={160}
                  fit="cover"
                  src={thumbnail?.url ?? PLACEHOLDER}
                  alt={thumbnail?.alt ?? tour.title}
                />
              </Card.Section>
              <Stack gap={4} mt="xs">
                <Text fw={500} lineClamp={1}>
                  {tour.title}
                </Text>
                {tour.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {tour.description}
                  </Text>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        )
      })}
    </Grid>
  )
}
