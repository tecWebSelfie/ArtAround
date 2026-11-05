import {
  claimIds,
  getWikidataEntities,
  localizedTexts,
  SUBJECT_PROPERTIES,
  type SubjectKind,
} from '@/lib/wikidata'
import i18nConfig from '@/../i18n.config'
import type { PayloadRequest, TaskConfig } from 'payload'

/** The app's languages: names come from Wikidata in each one it has. */
const LANGUAGES = i18nConfig.supportedLngs as string[]

/** Where each subject kind is linked on the work. */
const FIELD_OF_KIND: Record<SubjectKind, 'creators' | 'movements' | 'events'> = {
  person: 'creators',
  movement: 'movements',
  event: 'events',
}

type FetchImpl = typeof fetch

/**
 * Links a work to its subjects from its Wikidata item (requirement 5 of
 * `docs/plan/requisiti-18-33.md`): author (P170), movement (P135) and
 * significant events (P793), one level deep — the author's own teacher is
 * not imported. A subject that already exists (same Q-id) is reused;
 * otherwise it is created with its name and description in every app
 * language Wikidata has, so those need no machine translation.
 *
 * If Wikidata has merged the work's item into another, the work's
 * `wikidataId` is updated to the current id. Queued by the `objects` hook
 * when a work's `wikidataId` changes; seeds call it directly.
 */
export async function importWikidataSubjects(
  req: PayloadRequest,
  objectId: string,
  fetchImpl: FetchImpl = fetch,
): Promise<{ status: 'no-id' | 'not-found' | 'linked'; subjects: number }> {
  const { payload } = req
  const object = await payload.findByID({
    collection: 'objects',
    id: objectId,
    depth: 0,
    select: { wikidataId: true },
    overrideAccess: true,
    req,
  })
  if (!object.wikidataId) return { status: 'no-id', subjects: 0 }
  const work = (await getWikidataEntities([object.wikidataId], LANGUAGES, fetchImpl)).get(
    object.wikidataId,
  )
  if (!work) return { status: 'not-found', subjects: 0 }

  // The subjects' items, in one request, keyed by the kind they are linked as.
  const linked = (Object.entries(SUBJECT_PROPERTIES) as [string, SubjectKind][]).flatMap(
    ([property, kind]) => claimIds(work, property).map((id) => ({ id, kind })),
  )
  const entities = await getWikidataEntities(
    linked.map(({ id }) => id),
    LANGUAGES,
    fetchImpl,
  )

  const fields: Record<'creators' | 'movements' | 'events', string[]> = {
    creators: [],
    movements: [],
    events: [],
  }
  for (const { id, kind } of linked) {
    const entity = entities.get(id)
    if (!entity) continue
    const subjectId = await findOrCreateSubject(req, entity.id, kind, entity)
    if (subjectId && !fields[FIELD_OF_KIND[kind]].includes(subjectId)) {
      fields[FIELD_OF_KIND[kind]].push(subjectId)
    }
  }

  await payload.update({
    collection: 'objects',
    id: objectId,
    // Explicit: the localized subject writes above leave `req.locale` on the
    // last language, where the work may have no name to validate.
    locale: 'en',
    data: { ...fields, wikidataId: work.id },
    depth: 0,
    overrideAccess: true,
    // Linking subjects is no reason to regenerate the 3D model or re-import.
    context: { skipMintModelGeneration: true, skipWikidataImport: true },
    req,
  })
  return {
    status: 'linked',
    subjects: fields.creators.length + fields.movements.length + fields.events.length,
  }
}

async function findOrCreateSubject(
  req: PayloadRequest,
  wikidataId: string,
  kind: SubjectKind,
  entity: Parameters<typeof localizedTexts>[0],
): Promise<string | null> {
  const { payload } = req
  const { docs } = await payload.find({
    collection: 'subjects',
    where: { wikidataId: { equals: wikidataId } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  if (docs[0]) return String(docs[0].id)

  const texts = localizedTexts(entity, LANGUAGES)
  // English first (the source locale), else any language Wikidata has.
  const source = texts.find(({ language }) => language === 'en') ?? texts[0]
  if (!source) return null
  const created = await payload.create({
    collection: 'subjects',
    locale: 'en',
    data: {
      kind,
      wikidataId,
      name: source.name,
      description: source.description?.slice(0, 500),
      importedFromWikidata: true,
    },
    overrideAccess: true,
    req,
  })
  for (const { language, name, description } of texts) {
    if (language === 'en') continue
    await payload.update({
      collection: 'subjects',
      id: created.id,
      locale: language as 'en',
      data: { name, description: description?.slice(0, 500) },
      overrideAccess: true,
      req,
    })
  }
  return String(created.id)
}

export const importWikidataSubjectsTask: TaskConfig<'importWikidataSubjects'> = {
  slug: 'importWikidataSubjects',
  label: 'Link a work to its author, movement and events from Wikidata',
  inputSchema: [{ name: 'objectId', type: 'text', required: true }],
  outputSchema: [
    { name: 'status', type: 'text', required: true },
    { name: 'subjects', type: 'number' },
  ],
  retries: 2,
  handler: async ({ input, req }) => ({
    output: await importWikidataSubjects(req, input.objectId),
  }),
}
