'use client'

import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
  type MantineBreakpoint,
} from '@mantine/core'
import { Pencil, X } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Inline editing for simple data (metadata) on detail pages: the section
 * shows its read-only view and, for visitors allowed to edit (decided on the
 * server via `can()`), a labelled "Edit" button (pencil + word, so it reads as
 * an action rather than a decoration; `iconOnly` keeps the bare pencil) that
 * swaps the view for a form in place.
 * Complex relations (new contents, tours, staff) use dedicated pages instead.
 *
 * The form is any element rendered inside; it leaves edit mode by calling
 * `useEditableSection().close()` after a successful save.
 */
const EditableSectionContext = createContext<{ close: () => void }>({ close: () => {} })

export const useEditableSection = () => useContext(EditableSectionContext)

export function EditableSection({
  title,
  canEdit,
  form,
  actions,
  iconOnly = false,
  children,
  hideTitleFrom,
}: {
  /** Heading of the section; also names it in the Edit button's accessible name. */
  title: string
  canEdit: boolean
  /**
   * For visitors with no action here (can't edit, no `actions`), hide the
   * section title from this breakpoint.
   * Where the section's own content opens with the page's h1 (content and
   * object pages), the title is only a label above that heading; on desktop it
   * reads as an eyebrow. Editors keep it: it names what the pencil edits.
   */
  hideTitleFrom?: MantineBreakpoint
  form: ReactNode
  /**
   * Other owner actions on the same document (e.g. Delete), grouped after
   * Edit at the header's trailing edge, the destructive one in the corner.
   * Hidden while editing, so it never sits next to Save/Cancel.
   */
  actions?: ReactNode
  /**
   * A bare pencil icon (tooltip and accessible name say what it edits) instead
   * of the labelled "Edit" button: for pages where the section headers are
   * light and the page's own actions already sit near (the profile).
   */
  iconOnly?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation('editing')
  const [editing, setEditing] = useState(false)

  const label = editing ? t('Cancel editing') : t('Edit {{section}}', { section: title })
  const Icon = editing ? X : Pencil
  const icon = <Icon size={iconOnly ? 16 : 14} />
  const toggle = () => setEditing((value) => !value)

  return (
    <Stack gap="xs">
      {/* `hideTitleFrom` only drops a bare label: with Edit or other owner
          actions (e.g. Delete for museum staff who can't edit) the header
          stays, since it carries them. */}
      <Group
        justify="space-between"
        wrap="nowrap"
        hiddenFrom={canEdit || actions ? undefined : hideTitleFrom}
      >
        {/* h2: a section of its page, right under the page's h1 (an h3
            here skipped a level on the profile and detail pages). With
            `hideTitleFrom` the section's own content opens with the page's
            h1, so the title is only a label above it: a heading there would
            put an h2 before the h1. Same look either way. */}
        {hideTitleFrom ? (
          <Text fz="h4" fw={700} lh="h4">
            {title}
          </Text>
        ) : (
          <Title order={2} size="h4">
            {title}
          </Title>
        )}
        <Group gap={4} wrap="nowrap" className="shrink-0">
          {canEdit &&
            (iconOnly ? (
              <Tooltip label={label}>
                <ActionIcon
                  variant="subtle"
                  aria-label={label}
                  aria-pressed={editing}
                  onClick={toggle}
                >
                  {icon}
                </ActionIcon>
              </Tooltip>
            ) : (
              // The visible word stays short ("Edit" / "Cancel"); the accessible
              // name adds the section, and still starts with the visible word.
              <Button
                size="xs"
                variant="light"
                color={editing ? 'gray' : undefined}
                // Icon after the word, like every owner action in this row.
                rightSection={icon}
                aria-label={label}
                aria-pressed={editing}
                onClick={toggle}
              >
                {editing ? t('Cancel') : t('Edit')}
              </Button>
            ))}
          {!editing && actions}
        </Group>
      </Group>
      {editing ? (
        <EditableSectionContext.Provider value={{ close: () => setEditing(false) }}>
          {form}
        </EditableSectionContext.Provider>
      ) : (
        children
      )}
    </Stack>
  )
}
