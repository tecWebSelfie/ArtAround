import { normalizeRoomCode, ROOM_CODE_PATTERN } from '@/lib/group'
import { findGroupRoom } from '@/lib/group-room'
import { normalizeLocale } from '@/lib/localized'
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
  const room = ROOM_CODE_PATTERN.test(code) ? await findGroupRoom(code).catch(() => null) : null
  const { payload } = await getSession()
  const tour = room
    ? await payload
        .findByID({
          collection: 'tours',
          id: room.tourId,
          depth: 1,
          locale: normalizeLocale(lng) ?? 'en',
          select: { title: true, thumbnail: true },
        })
        .catch(() => null)
    : null
  const thumbnail = tour && typeof tour.thumbnail === 'object' ? tour.thumbnail : null

  return (
    <GroupRoomPage
      code={code}
      hostName={room?.hostName ?? ''}
      showResults={room?.showResults === true}
      tour={
        tour
          ? {
              id: tour.id,
              title: tour.title,
              thumbnail: thumbnail?.url ? { url: thumbnail.url, alt: thumbnail.alt } : null,
            }
          : null
      }
    />
  )
}
