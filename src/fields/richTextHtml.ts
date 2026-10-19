import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { CollectionBeforeValidateHook, TextareaField } from 'payload'

/**
 * Frontend rich-text editing bridge.
 *
 * Visitors edit rich text with Mantine's `RichTextEditor` (TipTap), which
 * speaks HTML, while Payload stores Lexical JSON. Instead of a client-side
 * converter we reuse Payload's own converters: the page renders the stored
 * value with `convertLexicalToHTML` for the editor, and submits HTML through a
 * write-only `<field>HTML` virtual field that this hook converts back to
 * Lexical with the collection's real editor config (same path as `seed.ts`).
 */

/** Write-only twin of a richText field, e.g. `bodyHTML` for `body`. */
export function richTextHtmlInput(richTextField: string): TextareaField {
  return {
    name: `${richTextField}HTML`,
    type: 'textarea',
    virtual: true,
    admin: { hidden: true },
    // Never returned: the stored Lexical value stays the single source of truth.
    hooks: { afterRead: [() => undefined] },
  }
}

/**
 * Runs before validation so a `required` richText field is already filled
 * when the HTML twin is the only value the client sent.
 */
export function richTextFromHtml(richTextFields: string[]): CollectionBeforeValidateHook {
  return async ({ data, req }) => {
    if (!data) return data
    for (const field of richTextFields) {
      const html = data[`${field}HTML`]
      if (typeof html !== 'string') continue
      // Loaded lazily with a real ESM import: a top-level import gets bundled
      // into the Payload config as a CommonJS `require`, which fails on
      // jsdom's ESM-only dependencies and takes every route down with it.
      const { JSDOM } = await import('jsdom')
      const editorConfig = await editorConfigFactory.default({ config: req.payload.config })
      data[field] = convertHTMLToLexical({ editorConfig, JSDOM, html })
      delete data[`${field}HTML`]
    }
    return data
  }
}
