import { relationshipIds } from '@/lib/search-index'
import { TranslationPending } from '@/components/TranslationPending'
import { normalizeLocale, requestTranslations } from '@/lib/localized'
import { lexicalToHTML } from '@/lib/richtext'
import { museumNavigationEntry } from '@/lib/navigation-entry'
import { asViewer, can, getSession } from '@/lib/session'
import config from '@/payload.config'
import { getPayload } from 'payload'
import MuseumPage from './MuseumPage'
import type { Metadata } from 'next'
import { cache } from 'react'

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const museums = await payload.find({
    collection: 'museums',
    limit: 100,
    pagination: false,
  })

  return museums.docs.map((museum) => ({
    id: museum.id,
  }))
}

/**
 * The museum, read once per request (React `cache`) for the page and its
 * metadata. As the visitor, so nested paid contents keep their body hidden.
 * In the visitor's language (English where a text is not translated yet: the
 * page queues those, see below); the metadata form is seeded from a separate
 * source-locale read, since it edits the English text.
 */
const readMuseum = cache(async (id: string, lng: string) => {
  const [{ payload }, viewer] = await Promise.all([getSession(), asViewer()])
  return payload.findByID({
    collection: 'museums',
    id,
    depth: 2,
    locale: normalizeLocale(lng) ?? 'en',
    ...viewer,
  })
})

/** The tab names the museum. */
export async function generateMetadata(props: PageProps<'/[lng]/museum/[id]'>): Promise<Metadata> {
  const { lng, id } = await props.params
  const museum = await readMuseum(id, lng).catch(() => null)
  return museum ? { title: museum.name } : {}
}

export default async function Museum(props: PageProps<'/[lng]/museum/[id]'>) {
  const { user, payload } = await getSession()
  const { lng, id } = await props.params
  const locale = normalizeLocale(lng) ?? 'en'
  // The permissions only need the id, so they are read alongside the museum.
  const [museum, canEditDetails, canManageMap] = await Promise.all([
    readMuseum(id, lng),
    can('museums', id, 'update', 'name'),
    can('museums', id, 'update', 'map'),
  ])
  const [source, ...pending] = await Promise.all([
    // What the metadata form edits: the English source text, not a
    // translation. Only the form's fields: never the map again.
    canEditDetails && locale !== 'en'
      ? payload.findByID({
          collection: 'museums',
          id,
          depth: 0,
          locale: 'en',
          select: {
            name: true,
            shortDescription: true,
            email: true,
            location: true,
            brandColor: true,
            description: true,
          },
        })
      : museum,
    // Whatever the page shows in English for lack of a translation is queued;
    // the page then refreshes until it reads in the visitor's language.
    requestTranslations(payload, 'museums', [id], locale, { urgent: true }),
    requestTranslations(payload, 'tours', relationshipIds(museum.tours?.docs), locale),
    // Capped: a large museum must not queue (or look up) hundreds at once;
    // the rest are translated when their own page or modal is opened.
    requestTranslations(payload, 'objects', relationshipIds(museum.objects).slice(0, 40), locale),
  ])

  return (
    <MuseumPage
      museum={museum}
      navigationHref={museumNavigationEntry(lng, museum)}
      translationNotice={pending.some(Boolean) && <TranslationPending />}
      editing={{
        lng,
        canEditDetails,
        canManageMap,
        isSignedIn: Boolean(user),
        // Only what the form needs: the full doc (map JSON) must not reach the client.
        source: {
          id: source.id,
          name: source.name,
          shortDescription: source.shortDescription,
          email: source.email,
          location: source.location,
          brandColor: source.brandColor,
          descriptionHTML: lexicalToHTML(source.description),
        },
      }}
    />
  )
}
