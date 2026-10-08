import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, ContentImage } from '@/payload-types'
import { Card, Grid, Group, Image, Stack, Text } from '@mantine/core'
import { Clock } from 'lucide-react'

import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'

const PLACEHOLDER = 'https://placehold.co/600x400?text=Placeholder'

export const ContentsSearchResults = async ({
  contents,
}: {
  contents: readonly (string | Content | null | undefined)[] | null | undefined
}) => {
  const { t } = await getT('search')
  const validContents = filterPopulated<Content>(contents)

  if (validContents.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('No contents found')}
      </Text>
    )
  }

  // Loaded lazily: only needed when cards (with difficulty labels) render.

  return (
    <Grid>
      {validContents.map((content) => {
        const thumbnail = filterPopulated<ContentImage>(content.images)[0] ?? null
        return (
          <Grid.Col key={content.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card
              shadow="sm"
              padding="sm"
              radius="md"
              withBorder
              className="border-2 border-solid border-teal-600"
            >
              <Card.Section>
                <Image
                  h={160}
                  fit="cover"
                  src={
                    isPopulated(thumbnail) && thumbnail.url ? thumbnail.url : PLACEHOLDER
                  }
                  alt={thumbnail?.alt ?? content.title}
                />
              </Card.Section>
              <Stack gap={4} mt="xs">
                <Text fw={500} lineClamp={1}>
                  {content.title}
                </Text>
                <Group gap="xs">
                  <DifficultyBadge difficulty={content.difficulty}>
                    {t(DIFFICULTY_LABEL_KEY[content.difficulty])}
                  </DifficultyBadge>
                  {content.readingTimeMins != null && (
                    <Group gap={4}>
                      <Clock size={14} aria-hidden />
                      <Text size="xs" c="dimmed">
                        {content.readingTimeMins} {t('min read')}
                      </Text>
                    </Group>
                  )}
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        )
      })}
    </Grid>
  )
}

