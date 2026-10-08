import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Object as PayloadObject } from '@/payload-types'
import { Button, Card, Grid, Image, Stack, Text } from '@mantine/core'
import Link from 'next/link'

const PLACEHOLDER = 'https://placehold.co/600x400?text=Placeholder'

export const ObjectsSearchResults = async ({
  objects,
  lng,
}: {
  objects: readonly (string | PayloadObject | null | undefined)[] | null | undefined
  lng: string
}) => {
  const { t } = await getT('search')
  const validObjects = filterPopulated<PayloadObject>(objects)

  if (validObjects.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('No objects found')}
      </Text>
    )
  }

  return (
    <Grid>
      {validObjects.map((object) => {
        const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
        return (
          <Grid.Col key={object.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="sm" radius="md" withBorder>
              <Card.Section>
                <Image
                  h={160}
                  fit="cover"
                  src={thumbnail?.url ?? PLACEHOLDER}
                  alt={thumbnail?.alt ?? object.name}
                />
              </Card.Section>
              <Stack gap={4} mt="xs">
                <Text fw={500} lineClamp={1}>
                  {object.name}
                </Text>
                {object.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {object.description}
                  </Text>
                )}
                <Button
                  component={Link}
                  href={`/${lng}/object/${object.id}`}
                  size="compact-sm"
                  variant="light"
                  fullWidth
                >
                  {t('View details')}
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        )
      })}
    </Grid>
  )
}
