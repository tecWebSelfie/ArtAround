import { getT } from '@/i18n.server'
import { Tour } from '@/payload-types'
import { JoinGroupForm } from '@/components/group/JoinGroupForm'
import { StartGroupButton } from '@/components/group/StartGroupButton'
import { Divider, Image, Title } from '@mantine/core'
import { Clock, MapPin, Play } from 'lucide-react'
import { summarizeTour } from '@/lib/tour-summary'
import { formatUnit } from '@/lib/duration'
import { KIND_FALLBACK } from '@/components/mantine/kind-fallback'
import { tourMuseumId, tourNavigationPath } from '@/lib/tour-navigation'
import Link from 'next/link'
import classes from './NavigationStartPage.module.css'

/**
 * Server-rendered introduction shown before the persistent map session
 * starts: start alone, lead a group, or join one with its code. Chosen in
 * live mode (DESIGN.md → Components → Tour start page): title and cover
 * centred in the space above a bottom dock, under the thumb — Start Tour as
 * a tinted panel framed by the tour gradient, with its stops/minutes under
 * the title and a matching "Lead the group" tile beside it.
 */
export default async function NavigationPage({ tour, lng }: { tour: Tour; lng: string }) {
  const { t } = await getT('tour-navigation')
  const { t: tc } = await getT('tours-carousel')
  const { t: tg } = await getT('group')
  const summary = summarizeTour(tour)
  const startHref = tourNavigationPath(lng, tourMuseumId(tour), tour.id, 0)
  const tourThumbnail = typeof tour.thumbnail === 'object' ? tour.thumbnail : null
  const cover = tourThumbnail?.url ? (
    <Image
      fit="cover"
      h="100%"
      w="100%"
      className="rounded-full"
      src={tourThumbnail.url}
      alt={tourThumbnail.alt ?? ''}
    />
  ) : (
    // No cover yet: the shared "image unavailable" placeholder (`KIND_FALLBACK`,
    // as on marketplace cards and the tour deck).
    <div
      className="flex h-full w-full items-center justify-center rounded-full"
      style={KIND_FALLBACK.tour.style}
      aria-hidden
    >
      <KIND_FALLBACK.tour.Icon size="35%" strokeWidth={1.5} />
    </div>
  )
  return (
    <div className={classes.root}>
      <div className={classes.identity}>
        <Title order={2} className="text-center text-balance">
          {tour.title}
        </Title>
        <div className={classes.cover}>{cover}</div>
      </div>
      <div className={classes.controls}>
        <div className={classes.ctas}>
          {/* `Link`, not a plain anchor: this stays a client-side transition
              into the museum's persistent map shell (TourNavigationShell),
              not a full reload that would tear it down and refetch it. */}
          <Link href={startHref} className={classes.start}>
            <span className={classes.startIcon} aria-hidden>
              <Play size={16} fill="currentColor" />
            </span>
            <span className={classes.startText}>
              <span className={classes.startTitle}>{t('Start Tour')}</span>
              <span className={classes.facts}>
                <span>
                  <MapPin size={14} aria-hidden />
                  {tc('{{count}} stops', { count: summary.stops })}
                </span>
                {summary.visitMinutes != null && (
                  <span>
                    <Clock size={14} aria-hidden />
                    {formatUnit(summary.visitMinutes, 'minute', lng)}
                  </span>
                )}
              </span>
            </span>
          </Link>
          {/* "Lead the group": next to the compact Start Tour panel, naming
              the action alone ("Start with a group") didn't say the visitor
              becomes its host; the modal already says so ("You lead the
              group…"), just not until it's open. */}
          <StartGroupButton
            tourId={tour.id}
            label={tg('Lead the group')}
            classNames={{
              inner: classes.groupInner,
              section: classes.groupSection,
              label: classes.groupLabel,
            }}
          />
        </div>
        <Divider label={t('or')} />
        <JoinGroupForm />
      </div>
    </div>
  )
}
