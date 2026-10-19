'use client'

import { ActionIcon, Group, Stack, Title, Tooltip } from '@mantine/core'
import { Pencil, X } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Inline editing for simple data (metadata) on detail pages: the section
 * shows its read-only view and, for visitors allowed to edit (decided on the
 * server via `can()`), a pencil that swaps the view for a form in place.
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
  children,
}: {
  title: string
  canEdit: boolean
  form: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation('editing')
  const [editing, setEditing] = useState(false)

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Title order={3} size="h4">
          {title}
        </Title>
        {canEdit && (
          <Tooltip
            label={editing ? t('Cancel editing') : t('Edit {{section}}', { section: title })}
          >
            <ActionIcon
              variant="subtle"
              aria-label={editing ? t('Cancel editing') : t('Edit {{section}}', { section: title })}
              aria-pressed={editing}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? <X size={16} /> : <Pencil size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
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
