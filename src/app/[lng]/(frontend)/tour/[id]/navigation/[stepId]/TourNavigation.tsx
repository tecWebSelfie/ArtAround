'use client'

import { Museum, Tour } from '@/payload-types'
import {
  ActionIcon,
  ActionIconGroup,
  ActionIconProps,
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellMainProps,
  Box,
  Button,
  Grid,
  GridCol,
  Group,
  Overlay,
  Progress,
  Stack,
  Title,
} from '@mantine/core'
import { spotlight, Spotlight } from '@mantine/spotlight'
import { validateBuildJson } from '@pascal-app/core'
import { FlagBannerFoldIcon } from '@phosphor-icons/react'
import {
  Accessibility,
  FlagTriangleRight,
  Info,
  LucideIcon,
  ScanQrCode,
  Search,
  ShoppingBag,
  Toilet,
  Utensils,
} from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { MuseumMap } from './MuseumMap'
import { TourProgress } from './TourProgress'
import {
  contentObjectId,
  tourContentPath,
  tourHasQuiz as hasQuiz,
  tourNavigationPath,
  tourQuizPath,
  withNavigationValue,
  withNavigationPosition,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/** Composes the map, ordered tour progress, object/content search, and scan controls. */
export const TourNavigationPage = ({
  tour,
  step,
  museum,
  catalog,
}: { tour: Tour; step: number; museum: Museum; catalog: NavigationCatalogObject[] } & Omit<
  AppShellMainProps,
  'step'
>) => {
  // URL state stays in the URL; this component reads it where map behavior needs it.
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const museumMap = useMemo(() => validateBuildJson(museum.map), [museum.map])
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const [routeUnavailable, setRouteUnavailable] = useState(false)
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  // Route guidance follows the next ordered content unless the visitor chose `to`.
  const defaultDestination =
    catalog.find((object) => object.contents.some((content) => content.id === nextId))?.id ??
    (typeof next === 'object' ? contentObjectId(next) : null)
  const destination = search.get('to') ?? defaultDestination
  const currentObjectId = search.get('at')
  // A stale/shared wheelchair URL still uses the standard mesh when this
  // museum has no wheelchair-specific mesh saved.
  const wheelchairRoute =
    Boolean(museum.navMeshWheelchair) && search.get('mobility') === 'wheelchair'
  const href = (path: string) => withNavigationPosition(path, search.toString())

  return (
    <>
      <AppShellHeader px="xs" pb="xs" className="rounded-b-xl">
        <Stack gap="xs">
          <Title size="h5" ta="center">
            {tour.title}
          </Title>
          <Grid>
            <GridCol span={1}>
              <FlagTriangleRight size={14} />
            </GridCol>
            <GridCol span={'auto'} align={'center'}>
              <Progress
                aria-label={t('Tour progress')}
                size={'xs'}
                value={tour.contents.length ? (step / tour.contents.length) * 100 : 100}
              />
            </GridCol>
            <GridCol span={1}>
              <FlagBannerFoldIcon size={14} />
            </GridCol>
          </Grid>
          <TourProgress contents={tour.contents} step={step} hasQuiz={hasQuiz(tour)} />
        </Stack>
      </AppShellHeader>

      <AppShellMain h="100dvh" className={`overflow-hidden`}>
        <Box pos="relative" h="100%">
          <Suspense fallback={<Box>{t('Loading map')}</Box>}>
            {museumMap.parsed ? (
              <MuseumMap
                map={museumMap.parsed}
                h="100%"
                w="100%"
                navMesh={wheelchairRoute ? museum.navMeshWheelchair : museum.navMesh}
                currentObjectId={currentObjectId}
                destinationObjectId={destination}
                onRouteUnavailable={setRouteUnavailable}
                onObjectClick={(id) =>
                  router.push(href(`${tourNavigationPath(lng, tour.id, step)}/object/${id}`))
                }
              />
            ) : (
              <Box>{t('Map not available')}</Box>
            )}
          </Suspense>
          <Overlay backgroundOpacity={0} style={{ pointerEvents: 'none' }}>
            <NavigationControls museum={museum} tour={tour} step={step} catalog={catalog} />
          </Overlay>
        </Box>
      </AppShellMain>

      <NavigationNavBar
        complete={step === tour.contents.length}
        routeUnavailable={routeUnavailable}
        tour={tour}
        step={step}
      />
    </>
  )
}

function NavigationNavBar({
  complete,
  routeUnavailable,
  tour,
  step,
}: {
  complete: boolean
  routeUnavailable: boolean
  tour: Tour
  step: number
}) {
  // Side exploration never advances the main tour cursor; only opening the
  // expected next content exposes the dedicated advance action in its modal.
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  const currentObjectId = search.get('at')
  const destinationObjectId = search.get('to')
  const href = (path: string) => withNavigationPosition(path, search.toString())
  const contentHref = (id: string) => href(tourContentPath(lng, tour, step, id))
  const setDestination = (id: string | null) =>
    router.replace(
      withNavigationValue(tourNavigationPath(lng, tour.id, step), search.toString(), 'to', id),
      { scroll: false },
    )
  return (
    <AppShellFooter className="rounded-t-md">
      <Group grow p="xs" align="center">
        {/* Compact heading: it now shares the 64px footer with the quiz action. */}
        {complete && (
          <Title order={2} size="h4">
            {t('Tour completed')}
          </Title>
        )}
        {complete && hasQuiz(tour) && (
          <Button onClick={() => router.push(tourQuizPath(lng, tour.id, step, search.toString()))}>
            {t('Take the quiz')}
          </Button>
        )}
        {!complete && nextId && (
          <Button onClick={() => router.push(contentHref(nextId))}>{t('Open next stop')}</Button>
        )}
        {destinationObjectId && (
          <Button variant="default" onClick={() => setDestination(null)}>
            {t('Resume tour route')}
          </Button>
        )}
        {routeUnavailable ? <Box>{t('No route available between these objects')}</Box> : null}
        {!currentObjectId && <Box>{t('Open an object and set it as your position')}</Box>}
      </Group>
    </AppShellFooter>
  )
}

function NavigationControls({
  museum,
  tour,
  step,
  catalog,
}: {
  museum: Museum
  tour: Tour
  step: number
  catalog: NavigationCatalogObject[]
}) {
  // Spotlight is built from the same museum-scoped summary catalog as the map;
  // it offers side exploration without changing the ordered tour step.
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const href = (path: string) => withNavigationPosition(path, search.toString())
  const wheelchairMapAvailable = Boolean(museum.navMeshWheelchair)
  const wheelchairRoute = wheelchairMapAvailable && search.get('mobility') === 'wheelchair'
  const toggleMobility = () =>
    router.replace(
      withNavigationValue(
        tourNavigationPath(lng, tour.id, step),
        search.toString(),
        'mobility',
        wheelchairRoute ? null : 'wheelchair',
      ),
      { scroll: false },
    )
  const contentHref = (id: string) => href(tourContentPath(lng, tour, step, id))
  const actions =
    catalog.flatMap((object) => [
      {
        id: `object:${object.id}`,
        label: object.name,
        description: t('Object'),
        onClick: () =>
          router.push(href(`${tourNavigationPath(lng, tour.id, step)}/object/${object.id}`)),
      },
      ...object.contents.map((content) => ({
        id: `content:${content.id}`,
        label: content.title,
        description: object.name,
        onClick: () => router.push(contentHref(content.id)),
      })),
    ]) ?? []
  return (
    <Stack className="h-full" justify="end">
      <Group
        gap="xs"
        wrap="nowrap"
        align="end"
        justify="space-around"
        className="p-2"
        style={{ pointerEvents: 'auto' }}
      >
        {museum.services && <ServicesActionIcons services={museum.services} />}

        {wheelchairMapAvailable && (
          <ActionIcon
            aria-label={t('Wheelchair route')}
            title={t('Wheelchair route')}
            size="lg"
            variant={wheelchairRoute ? 'filled' : 'white'}
            color={wheelchairMapAvailable ? 'blue' : 'gray'}
            radius="xl"
            disabled={!wheelchairMapAvailable}
            aria-pressed={wheelchairRoute}
            onClick={toggleMobility}
          >
            <Accessibility size={20} />
          </ActionIcon>
        )}

        <Button
          onClick={() => router.push(href(`${tourNavigationPath(lng, tour.id, step)}/scan`))}
          size="compact-xl"
          rightSection={<ScanQrCode size={24} />}
          color="dark"
          className="rounded-full"
        >
          {t('Scan')}
        </Button>
        <ActionIcon
          aria-label={t('Search')}
          variant="white"
          autoContrast
          radius={'xl'}
          size={'lg'}
          className="p-1.5"
          onClick={spotlight.open}
        >
          <Search className="size-full" />
        </ActionIcon>
        <Spotlight
          actions={actions}
          limit={8}
          nothingFound={t('No results found')}
          searchProps={{
            placeholder: t('Search museum objects and contents'),
            'aria-label': t('Search'),
          }}
        />
      </Group>
    </Stack>
  )
}

function ServicesActionIcons({ services }: { services: NonNullable<Museum['services']> }) {
  return (
    <ActionIconGroup orientation="vertical">
      {services.bathrooms && <ServiceIcon icon={Toilet} color="blue" aria-label="Toilette" />}
      {services.food && <ServiceIcon icon={Utensils} color="green" aria-label="Cibo" />}
      {services.infoPoint && (
        <ServiceIcon icon={Info} color="orange" aria-label="Punto informazioni" />
      )}
      {services.shop && <ServiceIcon icon={ShoppingBag} color="red" aria-label="Negozio" />}
    </ActionIconGroup>
  )
}

function ServiceIcon({ icon: Icon, ...props }: { icon: LucideIcon } & ActionIconProps) {
  return (
    <ActionIcon variant="light" className="border-(--mantine-color-default-border)" {...props}>
      <Icon size={16} />
    </ActionIcon>
  )
}
