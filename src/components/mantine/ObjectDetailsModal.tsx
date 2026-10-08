import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, Object } from '@/payload-types'
import { AspectRatio, Image, List, Stack, Text, Title } from '@mantine/core'

const PLACEHOLDER = 'https://placehold.co/600x400?text=Placeholder'

// Server Component: renders the modal body. Wrap it in the `ObjectModal` shell
// from `./Modal` (client) to get open/close behaviour — never import this file
// from a Client Component: it pulls in `next-i18next/server`, which imports
// `next/root-params` and is invalid in client bundles.
export async function ObjectDetailsContent({ object }: { object: Object }) {
  const { t } = await getT('object-details')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const contents = filterPopulated<Content>(object.contents)

  return (
    <Stack gap="sm">
      <AspectRatio ratio={16 / 9}>
        <Image
          radius="md"
          src={thumbnail?.url ?? PLACEHOLDER}
          alt={thumbnail?.alt ?? object.name}
        />
      </AspectRatio>
      <Title order={3}>{object.name}</Title>
      {object.description && <Text size="sm">{object.description}</Text>}
      {contents.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('Related contents')}
          </Text>
          <List size="sm">
            {contents.map((content) => (
              <List.Item key={content.id}>{content.title}</List.Item>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}
