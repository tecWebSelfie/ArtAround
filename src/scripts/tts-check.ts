/**
 * Read-aloud diagnostics for the production container, which can't be
 * entered: each step of the content-audio chain (docs/tour-navigation.md →
 * Listen) is tried on the real server, and the outcome lands in the
 * container's log, every line prefixed `[tts-check]`.
 *
 *   1. environment: working directory, user, whether a Fish Audio key is set;
 *   2. upload folders: where every upload collection writes (Payload resolves
 *      a relative `staticDir` against the working directory), whether the
 *      folder exists and is writable, free space, and a real 2 MB write;
 *   3. the `speech` queue: generation jobs done, failed or never started, with
 *      the latest errors they recorded;
 *   4. Fish Audio: one short synthesis with the model and voice the job uses;
 *   5. end to end: the job's own code (`generateContentAudio`) on one content
 *      that has no audio yet, which also leaves that audio in place.
 *
 * Run by the boot script (`scripts/standalone-boot.mjs`) before the server
 * (skip with `TTS_CHECK=0`), or by hand from the standalone folder:
 * `node scripts/standalone-tts-check.mjs`. Bundled by
 * `scripts/build-standalone-scripts.mjs`. Never prints a secret.
 */
// First: the working directory and `.env` files the boot script would give.
import './standalone-env'
import { AUDIO_MODEL, AUDIO_QUEUE, AUDIO_VOICE, contentAudioWhere } from '@/lib/content-audio'
import { speechAvailable, speechModel } from '@/lib/ai-models'
import { generateContentAudio } from '@/tasks/generateContentAudio'
import { generateSpeech } from 'ai'
import { access, constants, mkdir, rm, statfs, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createLocalReq, getPayload, type Payload } from 'payload'
import config from '../payload.config'

const log = (...parts: unknown[]) => console.log('[tts-check]', ...parts)

/** The parts of an error that say what went wrong, provider details included. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const extra = error as Error & {
    code?: string
    statusCode?: number
    responseBody?: string
    url?: string
    data?: unknown
  }
  const details = [
    `${error.name}: ${error.message}`,
    extra.code && `code=${extra.code}`,
    extra.statusCode && `status=${extra.statusCode}`,
    extra.url && `url=${extra.url}`,
    extra.responseBody && `response=${extra.responseBody.slice(0, 500)}`,
    extra.data !== undefined && `data=${JSON.stringify(extra.data).slice(0, 500)}`,
    error.cause !== undefined && `cause=${describe(error.cause)}`,
  ]
  return details.filter(Boolean).join(' | ')
}

/** Runs one step; a failure is logged with its stack and the next step runs. */
async function step(name: string, run: () => Promise<void>) {
  log(`--- ${name}`)
  try {
    await run()
  } catch (error) {
    log(`FAILED ${name}: ${describe(error)}`)
    if (error instanceof Error && error.stack) log(error.stack.split('\n').slice(0, 8).join('\n'))
  }
}

function environment() {
  log('cwd', process.cwd())
  log('node', process.version, 'platform', process.platform)
  log('user uid', process.getuid?.(), 'gid', process.getgid?.(), 'name', os.userInfo().username)
  log('FISH_API_KEY set:', Boolean(process.env.FISH_API_KEY), '| AI_MOCK:', process.env.AI_MOCK)
  log('speech available:', speechAvailable(), '| model', AUDIO_MODEL, '| voice', AUDIO_VOICE)
}

/** Every upload collection's folder: the same write the job's save does. */
async function uploadFolders(payload: Payload) {
  for (const collection of payload.config.collections) {
    if (!collection.upload) continue
    const dir = path.resolve(collection.upload.staticDir || collection.slug)
    const exists = await access(dir).then(
      () => true,
      () => false,
    )
    const writable = await access(dir, constants.W_OK).then(
      () => true,
      (error: NodeJS.ErrnoException) => error.code,
    )
    log(`${collection.slug}: ${dir} exists=${exists} writable=${writable}`)
    try {
      // Payload creates the folder on its first save, as this does.
      await mkdir(dir, { recursive: true })
      const { bavail, bsize } = await statfs(dir)
      log(`  free space: ${Math.round((bavail * bsize) / 1024 / 1024)} MB`)
      const probe = path.join(dir, `.tts-check-${process.pid}.bin`)
      await writeFile(probe, Buffer.alloc(2 * 1024 * 1024))
      await rm(probe)
      log('  2 MB write: ok')
    } catch (error) {
      log(`  write FAILED: ${describe(error)}`)
    }
  }
}

/** What the `speech` queue did: a pending job never tried means no runner. */
async function speechQueue(payload: Payload) {
  const { docs, totalDocs } = await payload.find({
    collection: 'payload-jobs',
    where: { taskSlug: { equals: 'generateContentAudio' } },
    sort: '-createdAt',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  const done = docs.filter((job) => job.completedAt).length
  const failed = docs.filter((job) => job.hasError)
  const waiting = docs.filter((job) => !job.completedAt && !job.hasError && !job.processing)
  const neverTried = waiting.filter((job) => !job.totalTried)
  log(
    `jobs: ${totalDocs} total | last ${docs.length}: ${done} done, ${failed.length} failed, ` +
      `${docs.filter((job) => job.processing).length} processing, ${waiting.length} waiting ` +
      `(${neverTried.length} never tried; oldest ${neverTried.at(-1)?.createdAt ?? '-'})`,
  )
  log(`queue name expected by the runner: ${AUDIO_QUEUE}; queues seen:`, [
    ...new Set(docs.map((job) => job.queue)),
  ])
  for (const job of failed.slice(0, 3)) {
    const lastError =
      [...(job.log ?? [])].reverse().find((entry) => entry.error)?.error ?? job.error
    log(`failed job ${job.id} (${job.createdAt}):`, JSON.stringify(lastError).slice(0, 800))
  }
}

async function fishAudio() {
  const started = Date.now()
  const { audio } = await generateSpeech({
    model: await speechModel(AUDIO_MODEL),
    text: 'Prova di sintesi vocale.',
    voice: AUDIO_VOICE,
    outputFormat: 'mp3',
  })
  log(
    `ok: ${audio.uint8Array.length} bytes, ${audio.mediaType}, ${Date.now() - started} ms, ` +
      `first bytes ${Buffer.from(audio.uint8Array.slice(0, 4)).toString('hex')}`,
  )
}

/** The job's code on the first content (with an English text) lacking its audio. */
async function endToEnd(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'contents',
    where: { body: { exists: true } },
    locale: 'en',
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    select: { title: true },
    overrideAccess: true,
  })
  for (const content of docs) {
    const existing = await payload.count({
      collection: 'contentAudio',
      where: contentAudioWhere(content.id, 'en'),
      overrideAccess: true,
    })
    if (existing.totalDocs) continue
    log(`content ${content.id} "${content.title}"`)
    const req = await createLocalReq({}, payload)
    const result = await generateContentAudio(req, { contentId: content.id, locale: 'en' })
    log('result', JSON.stringify(result))
    return
  }
  log(`all ${docs.length} contents checked already have an English audio: nothing to generate`)
}

try {
  const payload = await getPayload({ config })
  await step('environment', async () => environment())
  await step('upload folders', () => uploadFolders(payload))
  await step('speech queue', () => speechQueue(payload))
  await step('Fish Audio', fishAudio)
  await step('end to end', () => endToEnd(payload))
  log('--- done')
  // Mongoose and the plugins keep handles open: end the process ourselves.
  process.exit(0)
} catch (error) {
  log(`could not start: ${describe(error)}`)
  process.exit(1)
}
