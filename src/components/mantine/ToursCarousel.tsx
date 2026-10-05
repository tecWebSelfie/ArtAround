import { isPopulated } from '@/lib/isPopulated'
import { Tour } from '@/payload-types'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import { DepthSelect } from '@gfazioli/mantine-depth-select'
import {
  ActionIcon,
  AspectRatio,
  BackgroundImage,
  Badge,
  Button,
  Card,
  CardProps,
  CardSection,
  Center,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const TEXT_GRADIENT_ID = 'textGradient'

export const ToursCarousel = ({ tours, ...props }: CardProps & { tours: Tour[] }) => {
  const [index, setIndex] = useState(0)
  const { t } = useTranslation('tours-carousel')

  const currentTourId = tours[index]?.id

  const set = (tourId: string | number) => {
    const newIndex = tours.findIndex((tour) => tour.id === tourId)
    if (newIndex !== -1) {
      setIndex(newIndex)
    }
  }

  const previous = () => {
    if (index > 0) {
      setIndex(index - 1)
    }
  }

  const next = () => {
    if (index < tours.length - 1) {
      setIndex(index + 1)
    }
  }

  return (
    <>
      <svg width={0} height={0} className="absolute" aria-hidden>
        <defs>
          <linearGradient id={TEXT_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-purple-700, #7e22ce)" />
            <stop offset="100%" stopColor="var(--color-orange-400, #fb923c)" />
          </linearGradient>
        </defs>
      </svg>
      <BorderAnimate>
        <Card {...props} className="w-80 bg-linear-to-br from-purple-700 to-orange-400">
          <CardSection inheritPadding withBorder py="xs">
            <Group align="center" className="h-full">
              <Badge radius="xl" variant="white" className="py-3">
                <Text
                  className="font-semibold"
                  variant="gradient"
                  gradient={{ from: 'grape', to: 'orange' }}
                >
                  {t('Tours')}{' '}
                </Text>
              </Badge>
            </Group>
          </CardSection>
          <CardSection py="md" inheritPadding>
            <AspectRatio ratio={16 / 9}>
              <DepthSelect
                value={currentTourId}
                onChange={set}
                withControls={false}
                visibleCards={3}
                transitionDuration={500}
                scaleStep={0.06}
                translateYStep={8}
                opacityStep={0.1}
                blurStep={0.5}
                data={tours.map((tour) => ({
                  value: tour.id,
                  view: <TourCard tour={tour} />,
                }))}
              >
                <Center>
                  <Stack justify="space-between" className="h-1/2 pl-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <BorderAnimate key={index} radius="xl">
                        <ActionIcon
                          radius="xl"
                          variant="white"
                          autoContrast
                          className="border-mantine-grape-6"
                          onClick={index === 0 ? () => next() : () => previous()}
                        >
                          {index === 0 ? (
                            <ChevronUp size={18} stroke={`url(#${TEXT_GRADIENT_ID})`} />
                          ) : (
                            <ChevronDown size={18} stroke={`url(#${TEXT_GRADIENT_ID})`} />
                          )}
                        </ActionIcon>
                      </BorderAnimate>
                    ))}
                  </Stack>
                </Center>
              </DepthSelect>
            </AspectRatio>
          </CardSection>
        </Card>
      </BorderAnimate>
    </>
  )
}

const TourCard = ({ tour, ...props }: CardProps & { tour: Tour }) => {
  return (
    <Card className="h-full p-0" {...props}>
      <BackgroundImage
        src={
          isPopulated(tour.thumbnail) && tour.thumbnail.url
            ? tour.thumbnail.url
            : 'https://placehold.co/600x400?text=Placeholder'
        }
        className="h-full"
      >
        <Center className="h-full">
          <Stack justify="space-between" className="w-full h-full" p={'xs'}>
            <Title order={5}>{tour.title}</Title>
            <Group justify="end">
              <BorderAnimate variant="glow">
                <Button
                  classNames={{
                    label:
                      'bg-linear-to-r from-purple-700 to-orange-400 bg-clip-text text-transparent',
                    root: 'border-none',
                  }}
                  size="compact-md"
                  variant="outline"
                  className="bg-white"
                >
                  See details
                </Button>
              </BorderAnimate>
            </Group>
          </Stack>
        </Center>
      </BackgroundImage>
    </Card>
  )
}
