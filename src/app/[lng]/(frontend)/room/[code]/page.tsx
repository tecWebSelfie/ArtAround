import { normalizeRoomCode, ROOM_CODE_PATTERN } from '@/lib/group'
import { findGroupRoom } from '@/lib/group-room'
import { normalizeLocale } from '@/lib/localized'
import { tourMuseumId } from '@/lib/tour-navigation'
import { getSession } from '@/lib/session'
import { GroupRoomPage } from './GroupRoomPage'

/**
 * A group's page (`/[lng]/room/{code}`): the link and QR code the host shares.
 * Visitors who are not in the group yet get the join form; members get the
 * waiting room until the host starts the tour (then GroupProvider moves
 * everyone into it). An unknown or ended code shows that the group is over.
 */
export default async function RoomPage({ params }: PageProps<'/[lng]/room/[code]'>) {
  const { lng, code: raw } = await params
  const code = normalizeRoomCode(decodeURIComponent(raw))
  // The room (LiveKit) and the session (Payload) don't depend on each other.
  const [room, { payload }] = await Promise.all([
    ROOM_CODE_PATTERN.test(code) ? findGroupRoom(code).catch(() => null) : null,
    getSession(),
  ])
  const tour = room
    ? await payload
        .findByID({
          collection: 'tours',
          id: room.tourId,
          depth: 1,
          locale: normalizeLocale(lng) ?? 'en',
          select: { title: true, thumbnail: true, museum: true },
        })
        .catch(() => null)
    : null
  const thumbnail = tour && typeof tour.thumbnail === 'object' ? tour.thumbnail : null

  return (
    <GroupRoomPage
      code={code}
      hostName={room?.hostName ?? ''}
      showResults={room?.showResults ?? false}
      tour={
        tour
          ? {
              id: tour.id,
              // The tour map lives in its museum's navigation (tourNavigationPath).
              museumId: tourMuseumId(tour),
              title: tour.title,
              thumbnail: thumbnail?.url ? { url: thumbnail.url, alt: thumbnail.alt } : null,
            }
          : null
      }
    />
  )
}
