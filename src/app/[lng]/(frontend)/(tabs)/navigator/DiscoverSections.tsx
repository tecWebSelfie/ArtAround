import { TourRail } from '@/components/mantine/DiscoverRail'
import { getT } from '@/i18n.server'
import { MIN_RAIL_ITEMS, museumTours, railMuseums, rotatingCandidates } from '@/lib/discover'
import { requestTranslations } from '@/lib/localized'
import { museumScope } from '@/lib/museum-mode'
import { asViewer, getSession } from '@/lib/session'
import { Stack } from '@mantine/core'
import type { Route } from 'next'
import type { TypedLocale } from 'payload'
import { MuseumsRail } from './MuseumsRail'
import { RotatingRail } from './RotatingRail'

/**
 * The navigator home's discover rails, under the ways in (surface brief:
 * `.impeccable/surfaces/frontend-tabs-navigator-navigatorpage-tsx-*.md`).
 * At most two, so the home stays the place to start a visit and the
 * marketplace stays the place to browse:
 *
 * 1. the context rail: the locked museum's tours in museum mode, museums
 *    (nearest first once the visitor shares a position) in global mode;
 * 2. the rotating rail: one collection per visit (`RotatingRail`).
 *
 * Streamed in Suspense by the page, so the first screen never waits on it.
 */
export async function DiscoverSections({ lng }: { lng: string }) {
  const locale = lng as TypedLocale
  const sources = Promise.all([getSession(), asViewer(), museumScope()])
  const { t } = await getT('navigator-discover')
  const [{ payload }, viewer, scope] = await sources
  const museumId = scope?.museumId ?? null

  // The rotating candidates are read alongside the context rail; only their
  // final filter waits for it (`shown`).
  const context = museumId ? museumTours({ payload, locale, museumId }) : Promise.resolve([])
  const [contextTours, museums, candidates] = await Promise.all([
    context,
    museumId ? [] : railMuseums({ payload, locale, viewer }),
    rotatingCandidates({
      payload,
      locale,
      viewer,
      museumId,
      shown: context,
      titles: {
        quick: t('Quick visits'),
        stepFree: t('Step-free tours'),
        quiz: t('Tours with a final quiz'),
        newest: t('New tours'),
        category: (name) => t('Tours in {{category}}', { category: name }),
      },
    }),
  ])

  // Titles are machine-translated lazily: queue the context rail's in this
  // language (once per document and window; English shows meanwhile). The
  // rotating rail's pick happens in the browser; its tours get theirs when
  // opened.
  void requestTranslations(
    payload,
    'tours',
    contextTours.map((tour) => tour.id),
    locale,
  )
  void requestTranslations(
    payload,
    'museums',
    museums.map((museum) => museum.id),
    locale,
  )

  return (
    <Stack gap="xl">
      {scope && contextTours.length >= MIN_RAIL_ITEMS && (
        <TourRail
          title={t('Tours at {{museum}}', { museum: scope.name })}
          tours={contextTours}
          seeAllHref={`/${lng}/museum/${scope.museumId}` as Route}
        />
      )}
      {museums.length >= MIN_RAIL_ITEMS && <MuseumsRail museums={museums} />}
      <RotatingRail candidates={candidates} />
    </Stack>
  )
}
