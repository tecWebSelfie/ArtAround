import { EditableSection } from '@/components/editing/EditableSection'
import { MuseumAppearanceForm } from '@/components/editing/forms/MuseumAppearanceForm'
import { MuseumMetadataForm } from '@/components/editing/forms/MuseumMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { getT } from '@/i18n.server'
import { lexicalToHTML } from '@/lib/richtext'
import type { Museum } from '@/payload-types'
import { Box, Button, ColorSwatch, Group, Text } from '@mantine/core'
import { FilePlus, Map as MapIcon, QrCode, Route as Route_, Users } from 'lucide-react'
import type { Route } from 'next'

import { MuseumInfo as MuseumInfoView } from './MuseumInfo'
import type { MuseumEditing } from './MuseumPage'

/** Parts of the museum page (`MuseumPage.tsx`): its edit actions and its Info tab. */

/**
 * The staff's ways in: complex relations get dedicated pages (the map
 * editor, a new tour or content, the staff list, the objects' QR sheet);
 * metadata is edited in place (Info tab).
 */
export async function MuseumEditActions({
  museumId,
  editing,
}: {
  museumId: string
  editing: MuseumEditing
}) {
  if (!editing.isSignedIn && !editing.canManageMap) return null
  const { t: te } = await getT('editing')
  const { t: tc } = await getT('common')
  const base = `/${editing.lng}`
  return (
    <Group gap="xs">
      {editing.canManageMap && (
        <LinkButton
          href={`${base}/museum/${museumId}/edit/mapeditor` as Route}
          variant="light"
          size="xs"
          leftSection={<MapIcon size={14} />}
        >
          {te('Add objects to the map')}
        </LinkButton>
      )}
      {editing.isSignedIn && (
        <LinkButton
          href={`${base}/tour/new?museum=${museumId}` as Route}
          variant="light"
          size="xs"
          leftSection={<Route_ size={14} />}
        >
          {te('Add tour')}
        </LinkButton>
      )}
      {editing.isSignedIn && (
        <LinkButton
          href={`${base}/content/new` as Route}
          variant="light"
          size="xs"
          leftSection={<FilePlus size={14} />}
        >
          {te('Add content')}
        </LinkButton>
      )}
      {editing.canManageMap && (
        <LinkButton
          href={`${base}/museum/${museumId}/members` as Route}
          variant="subtle"
          size="xs"
          leftSection={<Users size={14} />}
        >
          {te('Staff')}
        </LinkButton>
      )}
      {editing.canManageMap && (
        // A sheet of labels, one QR per object on the map, in the
        // page's language (`/api/qr-sheet`). Scanned on site, each
        // opens the app in this museum. A plain download link.
        <Button
          component="a"
          href={`/api/qr-sheet?kind=museum&id=${museumId}&lng=${editing.lng}`}
          download
          variant="subtle"
          size="xs"
          leftSection={<QrCode size={14} aria-hidden />}
        >
          {tc('Print the QR codes of all objects')}
        </Button>
      )}
    </Group>
  )
}

/**
 * The Info tab: the read view (`MuseumInfo.tsx`: description, then the
 * visit's practical facts grouped by what the visitor is doing) under the
 * pencil that swaps it for the metadata form; then, for the director only,
 * the museum's color.
 */
export async function MuseumInfo({ museum, editing }: { museum: Museum; editing?: MuseumEditing }) {
  const { t: te } = await getT('editing')
  const descriptionHTML = lexicalToHTML(museum.description) || null
  return (
    // The pencil stays at the trailing edge of the section it edits; the
    // read view sets its own measures.
    <>
      <EditableSection
        title={te('About this museum')}
        canEdit={Boolean(editing?.canEditDetails)}
        form={
          editing && (
            <MuseumMetadataForm
              museum={editing.source}
              descriptionHTML={editing.source.descriptionHTML}
            />
          )
        }
      >
        <MuseumInfoView museum={museum} descriptionHTML={descriptionHTML} />
      </EditableSection>
      {/* The museum's color: only for the people who can change it
          (director); visitors just see the app wearing it. */}
      {editing?.canEditDetails && (
        <Box mt="xl">
          <EditableSection
            title={te('Museum color')}
            canEdit
            form={<MuseumAppearanceForm museum={editing.source} />}
          >
            <Group gap="xs">
              {museum.brandColor && <ColorSwatch color={museum.brandColor} size={20} aria-hidden />}
              <Text size="sm">{museum.brandColor ? museum.brandColor : te('Default blue')}</Text>
            </Group>
          </EditableSection>
        </Box>
      )}
    </>
  )
}
