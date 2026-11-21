/**
 * Records the Wikidata items the demo museum's seed needs into
 * `seed-assets/wikidata-entities.json`, so the seed links the demo works to
 * their authors, movements and events with no network (the deploy's boot
 * must work offline, like the works' photos in `seed-assets/objects/`).
 *
 * For each demo work: its own item, then the items its author (P170),
 * movement (P135) and event (P793) statements point to; labels and
 * descriptions in the app's languages, and only the statements the import
 * follows. Run it again after adding a demo work or a language:
 *
 *   pnpm exec tsx scripts/snapshot-wikidata.ts
 */
import { writeFile } from 'node:fs/promises'
import i18nConfig from '../i18n.config'
import {
  claimIds,
  getWikidataEntities,
  SUBJECT_PROPERTIES,
  type WikidataEntity,
} from '../src/lib/wikidata'
import { OBJECTS } from './demo-museum-data'
import { WIKIDATA_SNAPSHOT_PATH } from './offline-wikidata'

const LANGUAGES = i18nConfig.supportedLngs as string[]
const PROPERTIES = Object.keys(SUBJECT_PROPERTIES)

/** Language → text, without the API's repeated `language` field. */
const texts = (values: WikidataEntity['labels']) =>
  values &&
  Object.fromEntries(Object.entries(values).map(([language, { value }]) => [language, { value }]))

/** The entity as the import reads it: no other statements, references or qualifiers. */
function trim(entity: WikidataEntity & { redirects?: unknown }) {
  const claims = Object.fromEntries(
    PROPERTIES.flatMap((property) =>
      entity.claims?.[property]
        ? [
            [
              property,
              entity.claims[property].map(({ mainsnak, rank }) => ({
                mainsnak: { datavalue: { value: { id: mainsnak?.datavalue?.value?.id } } },
                rank,
              })),
            ],
          ]
        : [],
    ),
  )
  return {
    id: entity.id,
    labels: texts(entity.labels),
    descriptions: texts(entity.descriptions),
    ...(Object.keys(claims).length ? { claims } : {}),
    ...(entity.redirects ? { redirects: entity.redirects } : {}),
  }
}

const works = await getWikidataEntities(
  OBJECTS.flatMap((object) => (object.wikidataId ? [object.wikidataId] : [])),
  LANGUAGES,
)
const subjectIds = [...works.values()].flatMap((work) =>
  PROPERTIES.flatMap((property) => claimIds(work, property)),
)
const subjects = await getWikidataEntities(subjectIds, LANGUAGES)

// Keyed by the id asked for, the way `recordedWikidataFetch` looks them up (a
// merged item under its old id, with `redirects`).
const snapshot = Object.fromEntries(
  [...works, ...subjects]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, entity]) => [id, trim(entity)]),
)
await writeFile(WIKIDATA_SNAPSHOT_PATH, `${JSON.stringify(snapshot)}\n`)
console.info(
  `${works.size} works and ${subjects.size} subjects saved to ${WIKIDATA_SNAPSHOT_PATH}.`,
)
