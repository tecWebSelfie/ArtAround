import { EditableSection } from '@/components/editing/EditableSection'
import { ObjectMetadataForm } from '@/components/editing/forms/ObjectMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getT } from '@/i18n.server'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { can, getSession } from '@/lib/session'
import { isPopulated } from '@/lib/isPopulated'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { Container, Grid, GridCol, Group, Image } from '@mantine/core'
import { FilePlus } from 'lucide-react'
import type { Route } from 'next'

/**
 * Canonical object page. Shows the visitor's language; its owner edits the
 * source-locale name and description in place. Anyone signed in can write a
 * content about it (dedicated page, object preselected).
 *
 * Phones read one column (picture inside the details). From `md` the page is
 * two panes in a 1140px container: the picture alone on the left, sticky
 * under the site header and never taller than the viewport, and the details,
 * their inline editing and the actions on the right.
 */
export default async function Object({ params }: PageProps<'/[lng]/object/[id]'>) {
  const { lng, id } = await params
  const object = await getLocalizedPageDocument('objects', id, lng)
  const { payload, user } = await getSession()
  const canEdit = await can('objects', id, 'update')
  const source = canEdit
    ? await payload.findByID({
        collection: 'objects',
        id,
        locale: 'en',
        depth: 0,
        select: { name: true, description: true },
      })
    : null
  const { t } = await getT('editing')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null

  return (
    // `maw` widens Mantine's `md` container (960px) to 1140px from md only.
    <Container size="md" py="md" maw={{ md: 1140 }}>
      <Grid gap={{ base: 0, md: 48 }} align="flex-start">
        {/* Desktop media pane: natural aspect ratio, capped to the viewport
            height so a portrait or a placeholder never dominates. */}
        <GridCol
          span={{ md: 5 }}
          visibleFrom="md"
          pos="sticky"
          top="calc(var(--site-header-height, 0px) + var(--mantine-spacing-md))"
        >
          <Image
            radius="md"
            w="auto"
            maw="100%"
            mah="calc(100dvh - var(--site-header-height, 0px) - 2 * var(--mantine-spacing-md))"
            src={thumbnail?.url ?? PLACEHOLDER_IMAGE}
            alt={thumbnail?.alt ?? object.name}
          />
        </GridCol>
        <GridCol span={{ base: 12, md: 7 }}>
          <EditableSection
            title={t('Object')}
            canEdit={canEdit}
            // Visitors on desktop: no label above the h1 (it read as an eyebrow).
            hideTitleFrom="md"
            form={source && <ObjectMetadataForm object={{ ...source, id }} />}
          >
            {/* The inline picture is the media pane's job from md. */}
            <ObjectDetailsContent object={object} imageHiddenFrom="md" />
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
