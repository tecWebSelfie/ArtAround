import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, Object } from '@/payload-types'
import { Box, List, ListItem, Stack, Text, Title, type MantineBreakpoint } from '@mantine/core'
import { DetailCover } from './DetailCover'

// Server Component: renders the modal body. Wrap it in the `ObjectModal` shell
// from `./Modal` (client) to get open/close behaviour — never import this file
// from a Client Component: it pulls in `next-i18next/server`, which imports
// `next/root-params` and is invalid in client bundles.
export async function ObjectDetailsContent({
  object,
  hideContents = false,
  lightbox = false,
  coverHiddenFrom,
}: {
  object: Object
  hideContents?: boolean
  /** Only the object page: in modals no full-screen viewer stacks over the modal. */
  lightbox?: boolean
  /**
   * Hides the inline cover from this breakpoint up. The object page sets
   * `md`: on desktop it shows the cover in its own sticky pane beside these
   * details. Modals leave it unset (cover always inline).
   */
  coverHiddenFrom?: MantineBreakpoint
}) {
  const { t } = await getT('object-details')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const contents = filterPopulated<Content>(object.contents)

  return (
    <Stack gap="sm">
      {/* Photo and, when the object has one, its 3D model; the lightbox only on the object page. */}
      <Box hiddenFrom={coverHiddenFrom}>
        <DetailCover
          pictures={[thumbnail]}
          model={isPopulated(object.model) ? object.model : null}
          title={object.name}
          lightbox={lightbox}
        />
      </Box>
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
