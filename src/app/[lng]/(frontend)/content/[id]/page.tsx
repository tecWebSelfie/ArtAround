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
import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import { isPopulated } from '@/lib/isPopulated'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { normalizeLocale } from '@/lib/localized'
import { Container, Grid, GridCol, Group, Image, Stack, Text, Title } from '@mantine/core'
import { ChevronRight, Compass, FileText } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

/**
 * Canonical content page. The author edits metadata in place and the text on
 * `/content/:id/edit`; the author or museum staff above the author's rank may
 * delete it (`can(…, 'delete')` mirrors the moderation rule).
 *
 * Phones read one column: the text, then its actions. From `md` it is a
 * reading layout in a 1140px container: the text keeps its ~68ch measure on
 * the left and a sticky aside on the right holds what frames it (the object
 * it is about, its difficulty) above the same actions (unlock or "Find it on
 * the map", then the author's). Nothing in the aside needs an image.
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
  // The object this content is about (`contents.objects` is a single join,
  // read at depth 0 by the localized page read), for the desktop aside.
  const {
    docs: [object],
  } = await payload.find({
    collection: 'objects',
    where: { contents: { contains: id } },
    limit: 1,
    depth: 1,
    locale: normalizeLocale(lng) ?? 'en',
    select: { name: true, thumbnail: true },
    populate: { objectsThumbnails: { url: true, thumbnailURL: true, alt: true } },
  })
  const objectThumbnail = object && isPopulated(object.thumbnail) ? object.thumbnail : null
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
  const { t: tp } = await getT('tour-page')
  // Literal keys (tour-page namespace) so i18next-cli keeps them.
  const difficultyLabel = {
    easy: tp('Easy'),
    medium: tp('Medium'),
    hard: tp('Hard'),
  }[content.difficulty]

  return (
    // `maw` widens Mantine's `md` container (960px) to 1140px from md only.
    <Container size="md" py="md" maw={{ md: 1140 }}>
      <Grid gap={{ base: 0, md: 48 }} align="flex-start">
        <GridCol span={{ base: 12, md: 8 }}>
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
        </GridCol>
        {/* Below md this column simply follows the text (each action keeps
            its `mt`); from md it is the sticky aside. */}
        <GridCol
          span={{ base: 12, md: 4 }}
          pos={{ md: 'sticky' }}
          top={{ md: 'calc(var(--site-header-height, 0px) + var(--mantine-spacing-md))' }}
        >
          {/* Desktop only: phones keep today's text-first page. */}
          <Stack visibleFrom="md" gap="sm">
            {object && (
              <>
                <Title order={2} size="h4">
                  {t('Object')}
                </Title>
                <Link
                  href={`/${lng}/object/${object.id}` as Route}
                  className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-(--mantine-color-default-hover)"
                >
                  <Group gap="sm" wrap="nowrap">
                    <Image
                      src={
                        objectThumbnail?.thumbnailURL ?? objectThumbnail?.url ?? PLACEHOLDER_IMAGE
                      }
                      alt=""
                      w={56}
                      h={56}
                      radius="md"
                      className="shrink-0"
                    />
                    <Text fw={600} size="sm" lineClamp={2} className="flex-1">
                      {object.name}
                    </Text>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-(--mantine-color-dimmed)"
                      aria-hidden
                    />
                  </Group>
                </Link>
              </>
            )}
            <Group gap="xs">
              <DifficultyBadge difficulty={content.difficulty} variant="light">
                {difficultyLabel}
              </DifficultyBadge>
            </Group>
          </Stack>
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
              w={{ base: '100%', sm: 'auto', md: '100%' }}
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
        </GridCol>
      </Grid>
    </Container>
  )
}
