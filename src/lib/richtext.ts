import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/**
 * Stored Lexical value → HTML, for read-only rendering and for seeding the
 * frontend rich-text editor (which submits HTML back through `<field>HTML`).
 * Missing, malformed or access-hidden values become an empty string.
 */
export function lexicalToHTML(value: unknown): string {
  if (!value || typeof value !== 'object' || !('root' in value)) return ''
  try {
    return convertLexicalToHTML({ data: value as SerializedEditorState })
  } catch {
    return ''
  }
}
