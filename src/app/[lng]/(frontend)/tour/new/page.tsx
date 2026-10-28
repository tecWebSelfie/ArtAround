import { TourForm } from '@/components/editing/forms/TourForm'
import { getT } from '@/i18n.server'
import { lockedMuseumId } from '@/lib/museum-mode'
import { asViewer, getSession, requireUser } from '@/lib/session'
import { Alert, Container } from '@mantine/core'
import { getTourEditorData } from '../tour-editing'

/**
 * Create a tour (any signed-in user). Two entry points:
 * - `?museum=<id>` from a museum page ("Add tour");
 * - `?from=<tourId>` to customize someone else's tour: a new tour owned by
 *   the visitor, prefilled with the original's stops so locked (paid) ones
 *   can be replaced — the purchase modal's second option.
 */
export default async function NewTourPage({ params, searchParams }: PageProps<'/[lng]/tour/new'>) {
  const { lng } = await params
  const query = await searchParams
  const from = typeof query.from === 'string' ? query.from : null
  const museumParam = typeof query.museum === 'string' ? query.museum : null
  const returnTo = `/${lng}/tour/new?${from ? `from=${from}` : `museum=${museumParam ?? ''}`}`
  await requireUser(lng, returnTo)

  const { payload } = await getSession()
  const source = from
    ? await payload
        .findByID({ collection: 'tours', id: from, depth: 0, ...(await asViewer()) })
        .catch(() => null)
    : null
  // Museum mode: with no museum in the URL, a new tour is for the locked museum.
  const museumId = source
    ? typeof source.museum === 'string'
      ? source.museum
      : source.museum.id
    : (museumParam ?? (await lockedMuseumId()))

  if (!museumId) {
    const { t } = await getT('editing')
    return (
      <Container size="md" py="md">
        <Alert color="blue">
          {t('Open a museum and choose “Add tour” to build a tour for it.')}
        </Alert>
      </Container>
    )
  }

  const sourceStops = (source?.contents ?? []).map((content) =>
    typeof content === 'string' ? content : content.id,
  )
  // A customized copy shows the original's unvisitable stops too, flagged.
  const { museum, candidates } = await getTourEditorData(museumId, sourceStops)
  return (
    <Container size="md" py="md">
      <TourForm
        museum={museum}
        candidates={candidates}
        initial={
          source
            ? {
                title: source.title,
                description: source.description ?? '',
                contents: sourceStops,
              }
            : undefined
        }
      />
    </Container>
  )
}
