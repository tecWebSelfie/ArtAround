'use client'

import { createContext, useContext } from 'react'

/**
 * Who is using the map editor, provided once by `MapEditor` (from the server
 * session) so panels Pascal mounts deep in its own tree can adapt without
 * fetching the user again. UI hints only: every rule is enforced server-side.
 */
export type EditorViewer = { id: string; isSuperAdmin: boolean } | null

export const EditorViewerContext = createContext<EditorViewer>(null)

export const useEditorViewer = () => useContext(EditorViewerContext)

/** Owners (and super admins) may steer an object's model generation. */
export function canSteerObject(viewer: EditorViewer, createdBy: string | null | undefined) {
  return Boolean(viewer && (viewer.isSuperAdmin || (createdBy && createdBy === viewer.id)))
}
