import { backToTourHref } from '@/lib/tour-picker'
import type { Route } from 'next'
import { BackButton } from '@/components/navigation/BackButton'
import { ContentForm } from '@/components/editing/forms/ContentForm'
import { lockedMuseumId } from '@/lib/museum-mode'
import { getSession, requireUser } from '@/lib/session'
import { safeTourReturnTo } from '@/lib/tour-picker'
import { Container } from '@mantine/core'
import { extractID } from 'payload/shared'

/**
 * Write a new content. Any signed-in user may; `?object=<id>` preselects the
 * object it is about (e.g. from an object page's "Add content"), `?subject=<id>`
 * the artist, movement or event (a subject page's "Write about it").
 *
 * From the tour editor (`?museum=<id>&returnTo=<editor>`, see
 * `src/lib/tour-picker.ts`) it is a new stop: the object is chosen among that
 * museum's exhibited ones, and saving returns to the editor with it added.
 */
export default async function NewContentPage({
  params,
  searchParams,
}: PageProps<'/[lng]/content/new'>) {
  const { lng } = await params
  const query = await searchParams
  const param = (key: string) => {
    const value = query[key]
    return typeof value === 'string' ? value : null
  }
  const objectId = param('object')
  const subjectId = param('subject')
  const museumId = param('museum')
  const returnTo = safeTourReturnTo(lng, param('returnTo') ?? undefined)
  // The tour flow needs the museum and returnTo together; the museum alone
  // ("Your museums") only picks the objects offered.
  const tourFlow = Boolean(museumId && returnTo)
  const ownQuery = new URLSearchParams(
    Object.entries({
      object: objectId,
      subject: subjectId,
      museum: museumId,
      returnTo: tourFlow ? returnTo : null,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
  await requireUser(lng, `/${lng}/content/new${ownQuery.size ? `?${ownQuery}` : ''}`)

  const { payload } = await getSession()
  // The object picker offers one museum's objects: the one the link names
  // (the tour's in the tour flow, the row's on "Your museums"), else the
  // locked one in museum mode (like every list in the app).
  const pickerMuseumId = museumId ?? (await lockedMuseumId())
  // A missing or unreadable id just leaves its field empty.
  const [museum, object, subject] = await Promise.all([
    optional(pickerMuseumId, (id) =>
      payload.findByID({
        collection: 'museums',
        id,
        depth: 0,
        select: { name: true, objects: true },
      }),
    ),
    optional(objectId, (id) =>
      payload.findByID({ collection: 'objects', id, depth: 0, select: { name: true } }),
    ),
    optional(subjectId, (id) =>
      payload.findByID({ collection: 'subjects', id, depth: 0, select: { name: true } }),
    ),
  ])

  // Up a level: the tour being built (its draft restored) when the editor
  // was opened from it, else the work or the subject, else the navigator.
  let backHref = `/${lng}/navigator`
  if (tourFlow && returnTo) backHref = backToTourHref(returnTo)
  else if (object) backHref = `/${lng}/object/${object.id}`
  else if (subject) backHref = `/${lng}/subject/${subject.id}`

  return (
    <Container size="md" py="md">
      <BackButton href={backHref as Route} />
      <ContentForm
        // Cancel leaves for the same parent as the BackButton above.
        cancelHref={backHref as Route}
        initialObject={object ? { id: object.id, name: object.name } : null}
        initialSubject={subject ? { id: subject.id, name: subject.name } : null}
        museum={
          museum
            ? {
                name: museum.name,
                objectIds: (museum.objects ?? []).map(extractID),
              }
            : null
        }
        // Back to the tour only in the tour flow, not in plain museum mode.
        returnTo={tourFlow && museum ? returnTo : null}
      />
    </Container>
  )
}

/** The document behind an optional id, or null (no id, or unreadable). */
function optional<T>(id: string | null | undefined, read: (id: string) => Promise<T>) {
  return id ? read(id).catch(() => null) : null
}
