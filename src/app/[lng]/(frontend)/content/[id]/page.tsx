import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { EditableSection } from '@/components/editing/EditableSection'
import { ContentMetadataForm } from '@/components/editing/forms/ContentMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { getT } from '@/i18n.server'
import { ContentUnlock } from '@/components/payments/ContentUnlock'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { isLocked } from '@/lib/price'
import { contentNavigationEntry } from '@/lib/navigation-entry'
import { can, getSession } from '@/lib/session'
import { Container, Group } from '@mantine/core'
import { Compass, FileText } from 'lucide-react'
import type { Route } from 'next'

/**
 * Canonical content page. The author edits metadata in place and the text on
 * `/content/:id/edit`; the author or museum staff above the author's rank may
 * delete it (`can(…, 'delete')` mirrors the moderation rule).
 */
export default async function Content({ params }: PageProps<'/[lng]/content/[id]'>) {
  const { lng, id } = await params
  const content = await getLocalizedPageDocument('contents', id, lng)
  const locked = isLocked(content)
  const [canEdit, canDelete, navigationHref] = await Promise.all([
    can('contents', id, 'update'),
    can('contents', id, 'delete'),
    // The museum map with this content open and its object as destination;
    // not offered while the content is locked (buying it comes first).
    locked ? null : contentNavigationEntry(lng, id),
  ])
  const { payload } = await getSession()
  const source = canEdit
    ? await payload.findByID({
        collection: 'contents',
        id,
        locale: 'en',
        depth: 0,
        select: { title: true, difficulty: true, copyright: true, price: true },
      })
    : null
  const { t } = await getT('editing')
  const { t: tn } = await getT('tour-navigation')

  return (
    <Container size="md" py="md">
      <EditableSection
        title={t('Content')}
        canEdit={canEdit}
        form={source && <ContentMetadataForm content={{ ...source, id }} />}
      >
        <ContentDetailsModalContent
          content={content}
          lockedLabel={t('This content is paid. Unlock it to read the full text.')}
        />
      </EditableSection>
      {locked && (
        <Group mt="md">
          <ContentUnlock content={content} lng={lng} next={`/${lng}/content/${id}`} />
        </Group>
      )}
      {navigationHref && (
        // Readable contents only: a locked one offers the purchase instead.
        <LinkButton
          href={navigationHref}
          mt="md"
          color="blue.8"
          autoContrast
          leftSection={<Compass size={18} aria-hidden />}
          w={{ base: '100%', sm: 'auto' }}
        >
          {tn('Find it on the map')}
        </LinkButton>
      )}
      {(canEdit || canDelete) && (
        <Group mt="md" gap="xs">
          {canEdit && (
            <LinkButton
              href={`/${lng}/content/${id}/edit` as Route}
              variant="light"
              leftSection={<FileText size={16} />}
            >
              {t('Edit text')}
            </LinkButton>
          )}
          {canDelete && (
            <DeleteDocumentButton
              collection="contents"
              id={id}
              name={content.title}
              redirectTo={`/${lng}/navigator` as Route}
            />
          )}
        </Group>
      )}
    </Container>
  )
}
