import type { RichTextField, TextField, TextareaField } from 'payload'

type EditorialField = TextField | TextareaField | RichTextField

const AUTO_HINT = 'Editorial copy — auto-translated on demand into any locale.'

/**
 * Single factory for auto-translated editorial leaves (shape unchanged:
 * string / Lexical JSON). Pass a complete, valid field — `type` and `name`
 * are required, so nothing is ever localized implicitly. The generic preserves
 * the exact input type (required, maxLength, unique, editor, …).
 */
export function editorial<T extends EditorialField>(field: T): T {
  const { admin, ...rest } = field
  return {
    ...rest,
    localized: true,
    admin: { description: AUTO_HINT, ...admin },
  } as T
}
