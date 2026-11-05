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
import { can, getSession } from '@/lib/session'
import { QrCodeButton } from '@/components/QrCodeButton'
import { DetailCover } from '@/components/mantine/DetailCover'
import { Container, Grid, GridCol, Group } from '@mantine/core'
import { FilePlus } from 'lucide-react'
import type { Route } from 'next'

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
  const canEditPromise = can('objects', id, 'update')
  // Photo included (populated by getLocalizedPageDocument).
  const objectRead = getLocalizedPageDocument('objects', id, lng)
  const [object, subjects, canEdit, source, { t }, { printMuseumId, offer }] = await Promise.all([
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
    getT('editing'),
    // Its museum's staff print its QR code; opened from outside the app, the
    // museum's own app is offered.
    museumAffordances('object', id),
  ])
  // The form's preview reuses the populated photo.
  const photo = isPopulated(object.thumbnail) ? object.thumbnail : null
  const thumbnail = photo && { id: photo.id, url: pictureSrc(photo, 'card') }

  return (
    // `maw` widens Mantine's `md` container (960px) to 1140px from md only.
    <Container size="md" py="md" maw={{ md: 1140 }}>
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
          {offer && <MuseumModeOffer museum={offer} />}
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
              object={object}
              subjects={subjects}
              lightbox
              coverHiddenFrom="md"
            />
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
