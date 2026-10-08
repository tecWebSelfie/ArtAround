import { filterPopulated } from '@/lib/isPopulated'
import { Tour } from '@/payload-types'
import { Stack, Timeline, TimelineItem, Title } from '@mantine/core'

export default function TourPage(tour: Tour) {
  const contents = filterPopulated(tour.contents)

  return (
    <Stack justify="space-between" className="my-5">
      <Title size="h2" className="text-center">
        {tour.title}
      </Title>
      <Timeline>
        {contents.map((content) => (
          <TimelineItem opposite={true} key={content.id} title={content.title}></TimelineItem>
        ))}
      </Timeline>
    </Stack>
  )
}
