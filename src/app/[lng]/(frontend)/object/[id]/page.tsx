import { subjectsOfWork } from '@/lib/subjects'
import { EditableSection } from '@/components/editing/EditableSection'
import { ObjectMetadataForm } from '@/components/editing/forms/ObjectMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getT } from '@/i18n.server'
import { isPopulated } from '@/lib/isPopulated'
import { pictureSrc } from '@/lib/picture'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { museumAffordances } from '@/lib/qr-museum'
import { MuseumModeOffer } from '@/components/MuseumModeOffer'
import { asViewer, can, getSession } from '@/lib/session'
import { normalizeLocale } from '@/lib/localized'
import { LinkAnchor } from '@/components/mantine/LinkAnchor'
import type { Content } from '@/payload-types'
import { QrCodeButton } from '@/components/QrCodeButton'
import { DetailCover } from '@/components/mantine/DetailCover'
import {
  Box,
  Container,
  Grid,
  GridCol,
  Group,
  List,
  ListItem,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { FilePlus } from 'lucide-react'
import type { Route } from 'next'
import type { Metadata } from 'next'

/** The tab names the work; the read is the page's own (React cache). */
export async function generateMetadata({
  params,
}: PageProps<'/[lng]/object/[id]'>): Promise<Metadata> {
  const { lng, id } = await params
  const object = await getLocalizedPageDocument('objects', id, lng)
  return { title: object.name, description: object.description ?? undefined }
}

/**
 * Canonical object page. Shows the visitor's language; its owner edits the
 * source-locale name and description in place. Anyone signed in can write a
 * content about it (dedicated page, object preselected).
 *
 * Phones read one column (cover inside the details). From `md` the page is
 * two panes in a 1140px container: the cover alone on the left (photo,
 * lightbox and 3D model, the same `DetailCover`), sticky under the site
 * header and never taller than the viewport, and the details, their inline
 * editing and the actions on the right.
 */
export default async function Object({ params }: PageProps<'/[lng]/object/[id]'>) {
  const { lng, id } = await params
  const { payload, user } = await getSession()
  const viewer = await asViewer()
  const locale = normalizeLocale(lng) ?? 'en'
  const canEditPromise = can('objects', id, 'update')
  // Photo included (populated by getLocalizedPageDocument).
  const objectRead = getLocalizedPageDocument('objects', id, lng)
  const reads = Promise.all([
    objectRead,
    // Its authors, movements and events need only the object: chained onto
    // its read, they load alongside the rest instead of while rendering.
    objectRead.then((doc) => subjectsOfWork(doc, lng)),
    canEditPromise,
    // The owner's source-locale text for the inline form, alongside the rest.
    canEditPromise.then((allowed) =>
      allowed
        ? payload.findByID({
            collection: 'objects',
            id,
            locale: 'en',
            depth: 0,
            select: { name: true, description: true, wikidataId: true, inventoryNumber: true },
          })
        : null,
    ),
    // Its museum's staff print its QR code; opened from outside the app, the
    // museum's own app is offered.
    museumAffordances('object', id),
    // What to do next with this work: the contents about it (the localized
    // read returns their ids only) and the tours that stop at it. Read as the
    // visitor, so private tours and contents stay hidden.
    objectRead.then(async (doc) => {
      const ids = (doc.contents ?? []).map((content) =>
        typeof content === 'string' ? content : content.id,
      )
      if (ids.length === 0) return { contents: [], tours: [] }
      const [contents, tours] = await Promise.all([
        payload.find({
          collection: 'contents',
          where: { id: { in: ids } },
          select: { title: true, durationSeconds: true },
          limit: ids.length,
          pagination: false,
          locale,
          ...viewer,
        }),
        payload.find({
          collection: 'tours',
          where: { contents: { in: ids } },
          select: { title: true, contents: true },
          depth: 0,
          limit: 6,
          pagination: false,
          locale,
          ...viewer,
        }),
      ])
      // `id in` comes back in the database's order: put the contents back in
      // the object's own (curated) order.
      const byId = new Map(contents.docs.map((content) => [content.id, content as Content]))
      return {
        contents: ids.flatMap((contentId) => byId.get(contentId) ?? []),
        tours: tours.docs,
      }
    }),
  ])
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT('editing')
  const { t: tObject } = await getT('object-details')
  const [object, subjects, canEdit, source, { printMuseumId, offer }, related] = await reads
  // The form's preview reuses the populated photo.
  const photo = isPopulated(object.thumbnail) ? object.thumbnail : null
  const thumbnail = photo && { id: photo.id, url: pictureSrc(photo, 'card') }

  return (
    // `maw` widens Mantine's `md` container (960px) to 1140px from md only.
    <Container component="main" size="md" py="md" maw={{ md: 1140 }}>
      <Grid gap={{ base: 0, md: 48 }} align="flex-start">
        {/* Desktop media pane: the cover fills the viewport's height under the
            site header (capped, so it stays a picture beside the text, not a
            wall), with the same lightbox and 3D toggle as on phones. */}
        <GridCol span={{ md: 5 }} visibleFrom="md" pos="sticky" top="var(--site-pane-top)">
          <DetailCover
            pictures={[photo]}
            model={isPopulated(object.model) ? object.model : null}
            title={object.name}
            height="min(var(--site-pane-height), 640px)"
          />
        </GridCol>
        <GridCol span={{ base: 12, md: 7 }}>
          {offer && (
            <Box mb="md">
              <MuseumModeOffer museum={offer} />
            </Box>
          )}
          <EditableSection
            title={t('Object')}
            canEdit={canEdit}
            // Visitors on desktop: no label above the h1 (it read as an eyebrow).
            hideTitleFrom="md"
            actions={
              printMuseumId && (
                <QrCodeButton
                  kind="object"
                  id={id}
                  title={object.name}
                  printMuseumId={printMuseumId}
                  size="xs"
                />
              )
            }
            form={source && <ObjectMetadataForm object={{ ...source, id }} thumbnail={thumbnail} />}
          >
            {/* The inline cover is the media pane's job from md. */}
            <ObjectDetailsContent
              object={{ ...object, contents: related.contents }}
              subjects={subjects}
              lightbox
              coverHiddenFrom="md"
              headingOrder={1}
            />
            {related.tours.length > 0 && (
              <Stack gap={4} mt="md" component="section">
                <Title order={2} size="h5">
                  {tObject('Tours that stop here')}
                </Title>
                <List size="sm" spacing={4}>
                  {related.tours.map((tour) => (
                    <ListItem key={tour.id}>
                      <LinkAnchor href={`/${lng}/tour/${tour.id}` as Route} size="sm">
                        {tour.title}
                      </LinkAnchor>
                      <Text span size="sm" c="dimmed">
                        {` · ${tObject('{{count}} stops', { count: tour.contents?.length ?? 0 })}`}
                      </Text>
                    </ListItem>
                  ))}
                </List>
              </Stack>
            )}
          </EditableSection>
          {user && (
            <Group mt="md">
              <LinkButton
                href={`/${lng}/content/new?object=${id}` as Route}
                variant="light"
                leftSection={<FilePlus size={16} />}
              >
                {t('Write a content about this object')}
              </LinkButton>
            </Group>
          )}
        </GridCol>
      </Grid>
    </Container>
  )
}
