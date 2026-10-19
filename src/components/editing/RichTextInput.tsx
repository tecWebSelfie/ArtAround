'use client'

import { Input } from '@mantine/core'
import { Link, RichTextEditor } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Rich text field for frontend forms: Mantine's TipTap editor speaking HTML.
 * Payload stores Lexical JSON, so the page passes the stored value already
 * converted with `convertLexicalToHTML`, and forms submit the HTML through
 * the collection's write-only `<field>HTML` input, converted back on the
 * server (`src/fields/richTextHtml.ts`). The toolbar is limited to what both
 * formats round-trip cleanly.
 */
export function RichTextInput({
  label,
  description,
  error,
  required,
  value,
  onChange,
}: {
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  required?: boolean
  value: string
  onChange: (html: string) => void
}) {
  const { t } = useTranslation('editing')
  const editor = useEditor({
    // Next renders client components on the server first; TipTap must not.
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false }), Link],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  return (
    <Input.Wrapper
      label={label}
      description={description}
      error={error}
      required={required}
      labelElement="div"
    >
      <RichTextEditor
        editor={editor}
        labels={{
          boldControlLabel: t('Bold'),
          italicControlLabel: t('Italic'),
          h2ControlLabel: t('Heading'),
          h3ControlLabel: t('Subheading'),
          bulletListControlLabel: t('Bullet list'),
          orderedListControlLabel: t('Numbered list'),
          blockquoteControlLabel: t('Quote'),
          linkControlLabel: t('Link'),
          unlinkControlLabel: t('Remove link'),
          undoControlLabel: t('Undo'),
          redoControlLabel: t('Redo'),
        }}
      >
        <RichTextEditor.Toolbar>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Blockquote />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </Input.Wrapper>
  )
}
