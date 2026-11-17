import { imageUpload } from '@/fields/imageUpload'
import path from 'node:path'
import type { Config } from 'payload'

/**
 * Where every upload collection keeps its files: `UPLOADS_DIR/<folder>` when
 * `UPLOADS_DIR` is set, otherwise `<folder>` in the working directory, as
 * before (Payload resolves a relative `staticDir` against it).
 *
 * Production needs `UPLOADS_DIR`: the container's user can't create folders in
 * the standalone folder (EACCES, found by `src/scripts/tts-check.ts`), so no
 * upload was ever saved, read-aloud MP3s included; and a redeploy
 * (`rsync --delete`) would wipe files kept there anyway. A folder next to the
 * standalone, writable by the container's user, keeps them across deploys
 * (docs/standalone-deploy.md).
 *
 * The folders are the ones files already live in. Without its own
 * `staticDir`, Payload gives an upload config its collection's slug, and the
 * collections sharing `imageUpload` share that one object: the first of them,
 * `museumThumbnails`, named the folder for all of them. Kept as is, so files
 * already saved stay where their records expect them.
 *
 * Registered last among the plugins, so it also places the upload
 * collections other plugins add.
 */
const SHARED_IMAGE_FOLDER = 'museumThumbnails'

export const uploadsDirPlugin =
  (uploadsDir = process.env.UPLOADS_DIR) =>
  (config: Config): Config => ({
    ...config,
    collections: config.collections?.map((collection) => {
      if (!collection.upload) return collection
      const upload = collection.upload === true ? {} : collection.upload
      const folder =
        upload.staticDir ?? (upload === imageUpload ? SHARED_IMAGE_FOLDER : collection.slug)
      return {
        ...collection,
        upload: { ...upload, staticDir: uploadsDir ? path.resolve(uploadsDir, folder) : folder },
      }
    }),
  })
