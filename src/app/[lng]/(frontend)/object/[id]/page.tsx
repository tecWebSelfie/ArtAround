import { EditableSection } from '@/components/editing/EditableSection'
import { ObjectMetadataForm } from '@/components/editing/forms/ObjectMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getT } from '@/i18n.server'
import { isPopulated } from '@/lib/isPopulated'
import { pictureSrc } from '@/lib/picture'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { can, getSession } from '@/lib/session'
import { Container, Group } from '@mantine/core'
import { FilePlus } from 'lucide-react'
import type { Route } from 'next'

/**
 * Canonical object page. Shows the visitor's language; its owner edits the
 * source-locale name and description in place. Anyone signed in can write a
 * content about it (dedicated page, object preselected).
 */
export default async function Object({ params }: PageProps<'/[lng]/object/[id]'>) {
  const { lng, id } = await params
  const { payload, user } = await getSession()
  const canEditPromise = can('objects', id, 'update')
  const [object, canEdit, source, { t }] = await Promise.all([
    // Photo included (populated by getLocalizedPageDocument).
    getLocalizedPageDocument('objects', id, lng),
    canEditPromise,
    // The owner's source-locale text for the inline form, alongside the rest.
    canEditPromise.then((allowed) =>
      allowed
        ? payload.findByID({
            collection: 'objects',
            id,
            locale: 'en',
            depth: 0,
            select: { name: true, description: true },
          })
        : null,
    ),
    getT('editing'),
  ])
  // The form's preview reuses the populated photo.
  const photo = isPopulated(object.thumbnail) ? object.thumbnail : null
  const thumbnail = photo && { id: photo.id, url: pictureSrc(photo, 'card') }

  return (
    <Container size="md" py="md">
      <EditableSection
        title={t('Object')}
        canEdit={canEdit}
        form={source && <ObjectMetadataForm object={{ ...source, id }} thumbnail={thumbnail} />}
      >
        <ObjectDetailsContent object={object} lightbox />
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
    </Container>
  )
}
