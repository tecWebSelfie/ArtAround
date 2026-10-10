import config from '@/payload.config'
import { AppShellFooter } from '@mantine/core'
import { getPayload } from 'payload'
import { TourNavigation } from './TourNavigation'

export default async function TourNavigationLayout({
  navbar,
  params,
}: LayoutProps<'/[lng]/tour/[id]/navigation/[contentId]'>) {
  const { id: tourId, contentId: step } = await params
  const payload = await getPayload({
    config,
  })
  const tour = await payload.findByID({
    collection: 'tours',
    id: tourId,
    joins: {
      museum: {
        limit: 1,
      },
    },
  })
  const museum = typeof tour.museum.docs?.[0] === 'object' ? tour.museum.docs?.[0] : null

  return (
    <>
      <TourNavigation tour={tour} step={parseInt(step)} />
      <AppShellFooter component="nav">{navbar}</AppShellFooter>
    </>
  )
}
