'use client'

import type { PictureCollection } from '@/lib/picture'
import { payloadSdk } from '@/payload-sdk'
import { Button, FileButton, Group, Image, Input, Paper, Text } from '@mantine/core'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The cover picture field of the editing forms (object, content, tour): a
 * preview of the current picture, "Choose/Change image" and "Remove". The
 * picked file stays in the browser until the form is saved; `saveCover` then
 * uploads it to the document's picture collection (which derives the card and
 * cover sizes, src/fields/imageUpload.ts) and returns the id to store.
 */

/** A picture already stored: its upload document's id and preview URL. */
export type CurrentImage = { id: string; url?: string | null }

/** What the author did: nothing (`null`), picked a new file, or removed it. */
export type CoverChange = null | File | 'remove'

export function CoverImageInput({
  current,
  change,
  onChange,
}: {
  current?: CurrentImage | null
  change: CoverChange
  onChange: (change: CoverChange) => void
}) {
  const { t } = useTranslation('editing')
  // A blob URL for the picked file's preview, revoked when replaced.
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!(change instanceof File)) return setPickedUrl(null)
    const url = URL.createObjectURL(change)
    setPickedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [change])

  const previewUrl = pickedUrl ?? (change === 'remove' ? null : current?.url)

  return (
    <Input.Wrapper label={t('Cover image')} labelElement="div">
      <Paper withBorder radius="md" p="xs">
        <Group gap="sm" wrap="nowrap" align="center">
          {previewUrl ? (
            <Image src={previewUrl} alt="" w={96} h={72} radius="sm" fit="cover" />
          ) : (
            <Text size="sm" c="dimmed" w={96} ta="center">
              {t('No image')}
            </Text>
          )}
          <Group gap="xs">
            <FileButton accept="image/*" onChange={(file) => file && onChange(file)}>
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  variant="light"
                  rightSection={<ImagePlus size={14} aria-hidden />}
                >
                  {previewUrl ? t('Change image') : t('Choose an image')}
                </Button>
              )}
            </FileButton>
            {previewUrl && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                rightSection={<Trash2 size={14} aria-hidden />}
                onClick={() => onChange(current ? 'remove' : null)}
              >
                {t('Remove image')}
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Input.Wrapper>
  )
}

/**
 * The picture id to store once the form is saved: the current one when
 * nothing changed, `null` when removed, or a fresh upload of the picked file.
 * `alt` names the picture for screen readers (required on object thumbnails).
 */
export async function saveCover(
  change: CoverChange,
  current: CurrentImage | null | undefined,
  collection: PictureCollection,
  alt: string,
): Promise<string | null> {
  if (change === null) return current?.id ?? null
  if (change === 'remove') return null
  const uploaded = await payloadSdk.create({ collection, file: change, data: { alt } })
  return uploaded.id
}
