import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { EditableSection } from '@/components/editing/EditableSection'
import { ContentMetadataForm } from '@/components/editing/forms/ContentMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { getT } from '@/i18n.server'
import { ContentUnlock } from '@/components/payments/ContentUnlock'
import { normalizeLocale, resolveLocalized } from '@/lib/localized'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { isLocked } from '@/lib/price'
import { contentNavigationEntry } from '@/lib/navigation-entry'
import { asViewer, can, getSession } from '@/lib/session'
import type { Content } from '@/payload-types'
import { Container, Divider, Group } from '@mantine/core'
import { Compass, FileText } from 'lucide-react'
import type { Route } from 'next'
import { ContentDetails, type ContentDetailsProps } from './ContentDetails'

const firstId = (values: readonly (string | { id: string })[] | null | undefined) => {
  const [first] = values ?? []
  return typeof first === 'string' ? first : first?.id
}

/**
 * Loads what `ContentDetails` shows around the text, from the content's own
 * relations (ids at depth 0). Every read goes through `asViewer()`, so access
 * rules hold as for REST, and uses the visitor's locale (Payload falls back to
 * English for untranslated fields). The object's editorial text goes through
 * `resolveLocalized`, the same read the object page makes. Reads are
 * independent and run in parallel; a relation that can't be read (deleted,
 * denied) only hides its section, never the page.
 */
async function loadContentDetails(
  content: Content,
  id: string,
  lng: string,
): Promise<Omit<ContentDetailsProps, 'content'>> {
  const { payload, user } = await getSession()
  const viewer = await asViewer()
  const locale = normalizeLocale(lng) ?? 'en'
  const objectId = firstId(content.objects?.docs)
  const authorId = typeof content.author === 'string' ? content.author : content.author?.id
  const categoryIds = (content.categories ?? []).map((c) => (typeof c === 'string' ? c : c.id))
  const imageIds = (content.images ?? []).map((i) => (typeof i === 'string' ? i : i.id))
  const origin = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000'

  const [objectText, objectMedia, author, categories, images, tours] = await Promise.all([
    objectId
      ? resolveLocalized(payload, origin, { collection: 'objects', id: objectId, locale, user })
      : null,
    // Thumbnail and museum: relations the depth-0 localized read leaves as ids.
    objectId
      ? payload
          .findByID({
            collection: 'objects',
            id: objectId,
            depth: 1,
            locale,
            select: { thumbnail: true, museums: true },
            populate: {
              objectsThumbnails: { url: true, thumbnailURL: true, alt: true },
              museums: { name: true, shortDescription: true },
            },
            ...viewer,
          })
          .catch(() => null)
      : null,
    authorId
      ? payload
          .findByID({
            collection: 'users',
            id: authorId,
            depth: 1,
            select: { name: true, avatar: true, bio: true },
            populate: { usersPropics: { url: true, thumbnailURL: true, alt: true } },
            ...viewer,
          })
          .catch(() => null)
      : null,
    categoryIds.length
      ? payload.find({
          collection: 'museumCategories',
          where: { id: { in: categoryIds } },
          select: { name: true },
          locale,
          depth: 0,
          pagination: false,
          ...viewer,
        })
      : null,
    imageIds.length
      ? payload.find({
          collection: 'contentImages',
          where: { id: { in: imageIds } },
          select: { url: true, thumbnailURL: true, alt: true },
          locale,
          depth: 0,
          pagination: false,
          ...viewer,
        })
      : null,
    payload.find({
      collection: 'tours',
      where: { contents: { contains: id } },
      select: { title: true, thumbnail: true, museum: true },
      populate: {
        toursThumbnails: { url: true, thumbnailURL: true, alt: true },
        museums: { name: true },
      },
      locale,
      depth: 1,
      limit: 6,
      sort: '-updatedAt',
      ...viewer,
    }),
  ])

  const object = objectText && objectText.kind !== 'not-found' ? objectText.doc : null
  const museum = objectMedia?.museums?.docs?.find(
    (doc): doc is Exclude<typeof doc, string> => typeof doc !== 'string',
  )
  // Siblings come from the object's authored `contents` list (as on the object page).
  const relatedIds = (object?.contents ?? [])
    .map((c) => (typeof c === 'string' ? c : c.id))
    .filter((relatedId) => relatedId !== id)
  const related = relatedIds.length
    ? await payload.find({
        collection: 'contents',
        where: { id: { in: relatedIds } },
        select: { title: true, difficulty: true, readingTimeMins: true, images: true },
        populate: { contentImages: { url: true, thumbnailURL: true, alt: true } },
        locale,
        depth: 1,
        limit: 6,
        ...viewer,
      })
    : null

  return {
    object: object && { ...object, thumbnail: objectMedia?.thumbnail ?? null },
    museum: museum ?? null,
    author,
    // `in` queries don't keep the authored order: restore it.
    categories: categoryIds.flatMap((cid) => categories?.docs.filter((c) => c.id === cid) ?? []),
    images: imageIds.flatMap((iid) => images?.docs.filter((i) => i.id === iid) ?? []),
    tours: tours.docs,
    related: related?.docs ?? [],
  }
}

/**
 * Canonical content page. The author edits metadata in place and the text on
 * `/content/:id/edit`; the author or museum staff above the author's rank may
 * delete it (`can(…, 'delete')` mirrors the moderation rule). Below the text,
 * `ContentDetails` puts it in context: the object and museum it is about, its
 * author, sources, pictures and the tours that include it.
 */
export default async function Content({ params }: PageProps<'/[lng]/content/[id]'>) {
  const { lng, id } = await params
  const content = await getLocalizedPageDocument('contents', id, lng)
  const locked = isLocked(content)
  const [canEdit, canDelete, navigationHref, details] = await Promise.all([
    can('contents', id, 'update'),
    can('contents', id, 'delete'),
    // The museum map with this content open and its object as destination;
    // not offered while the content is locked (buying it comes first).
    locked ? null : contentNavigationEntry(lng, id),
    loadContentDetails(content, id, lng),
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
      <Divider my="xl" />
      <ContentDetails content={content} {...details} />
    </Container>
  )
}
