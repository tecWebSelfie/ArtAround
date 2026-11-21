import { describe, expect, it } from 'vitest'
import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { imageUpload } from '@/fields/imageUpload'
import { uploadsDirPlugin } from '@/plugins/uploadsDir'

/** Upload folders (src/plugins/uploadsDir.ts): same folders, movable base. */
const collections: CollectionConfig[] = [
  { slug: 'museumThumbnails', upload: imageUpload, fields: [] },
  { slug: 'toursThumbnails', upload: imageUpload, fields: [] },
  { slug: 'museumMaps', upload: true, fields: [] },
  { slug: 'contentAudio', upload: { mimeTypes: ['audio/mpeg'] }, fields: [] },
  { slug: 'tours', fields: [] },
]
const folders = (uploadsDir?: string) =>
  uploadsDirPlugin(uploadsDir)({ collections } as never).collections?.map((collection) =>
    typeof collection.upload === 'object' ? collection.upload.staticDir : null,
  )

describe('upload folders', () => {
  it('keeps the folders files already live in, relative without UPLOADS_DIR', () => {
    // The image collections share `imageUpload`, whose folder was the first one's.
    expect(folders()).toEqual([
      'museumThumbnails',
      'museumThumbnails',
      'museumMaps',
      'contentAudio',
      null,
    ])
  })
  it('moves every folder under UPLOADS_DIR', () => {
    expect(folders('/srv/uploads')).toEqual([
      path.resolve('/srv/uploads/museumThumbnails'),
      path.resolve('/srv/uploads/museumThumbnails'),
      path.resolve('/srv/uploads/museumMaps'),
      path.resolve('/srv/uploads/contentAudio'),
      null,
    ])
  })
  it('never mutates the shared upload config', () => {
    folders('/srv/uploads')
    expect(imageUpload).not.toHaveProperty('staticDir')
  })
})
