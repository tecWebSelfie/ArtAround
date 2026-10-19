import { EditableSection } from '@/components/editing/EditableSection'
import { ObjectMetadataForm } from '@/components/editing/forms/ObjectMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ObjectDetailsContent } from '@/components/mantine/ObjectDetailsModal'
import { getT } from '@/i18n.server'
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

  return (
    <Container size="md" py="md">
      <EditableSection
        title={t('Object')}
        canEdit={canEdit}
        form={source && <ObjectMetadataForm object={{ ...source, id }} />}
      >
        <ObjectDetailsContent object={object} />
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
