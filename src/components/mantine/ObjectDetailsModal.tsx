import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, Object } from '@/payload-types'
import { AspectRatio, Image, List, ListItem, Stack, Text, Title } from '@mantine/core'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

// Server Component: renders the modal body. Wrap it in the `ObjectModal` shell
// from `./Modal` (client) to get open/close behaviour — never import this file
// from a Client Component: it pulls in `next-i18next/server`, which imports
// `next/root-params` and is invalid in client bundles.
export async function ObjectDetailsContent({
  object,
  hideContents = false,
}: {
  object: Object
  hideContents?: boolean
}) {
  const { t } = await getT('object-details')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const contents = filterPopulated<Content>(object.contents)

  return (
    <Stack gap="sm">
      <AspectRatio ratio={16 / 9}>
        <Image
          radius="md"
          src={thumbnail?.url ?? PLACEHOLDER_IMAGE}
          alt={thumbnail?.alt ?? object.name}
        />
      </AspectRatio>
      <Title order={3}>{object.name}</Title>
      {object.description && <Text size="sm">{object.description}</Text>}
      {!hideContents && contents.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('Related contents')}
          </Text>
          <List size="sm">
            {contents.map((content) => (
              // `ListItem`, not `List.Item`: server component (see SearchResultCard).
              <ListItem key={content.id}>{content.title}</ListItem>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}
