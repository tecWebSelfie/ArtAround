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
  FlagTriangleRight,
  Info,
  LucideIcon,
  ScanQrCode,
  Search,
  ShoppingBag,
  Toilet,
  Utensils,
} from 'lucide-react'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { MuseumMap } from './MuseumMap'
import { TourProgress } from './TourProgress'
import {
  contentObjectId,
  tourContentPath,
  tourNavigationPath,
  withNavigationValue,
  withNavigationPosition,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const pathname = usePathname()
  const { t } = useTranslation('tour-navigation')
  // Identical default on desktop and mobile. This is never inferred from screen size.
  const [firstPersonPath, setFirstPersonPath] = useState<string | null>(null)
  const firstPerson = firstPersonPath === pathname
  const [routeUnavailable, setRouteUnavailable] = useState(false)
  // Tying the mode to its URL resets it on route changes without a state effect.
  const exitFirstPerson = useCallback(() => setFirstPersonPath(null), [])
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  // Route guidance follows the next ordered content unless the visitor chose `to`.
  const defaultDestination =
    catalog.find((object) => object.contents.some((content) => content.id === nextId))?.id ??
    (typeof next === 'object' ? contentObjectId(next) : null)
  const destination = search.get('to') ?? defaultDestination
  const currentObjectId = search.get('at')
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
          <TourProgress contents={tour.contents} step={step} />
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
                navMesh={museum.navMesh}
                currentObjectId={currentObjectId}
                destinationObjectId={destination}
                firstPerson={firstPerson}
                onExitFirstPerson={exitFirstPerson}
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
            <NavigationControls
              museum={museum}
              firstPerson={firstPerson}
              onToggleFirstPerson={() =>
                setFirstPersonPath((activePath) => (activePath === pathname ? null : pathname))
              }
              mapAvailable={Boolean(museumMap.parsed)}
              tour={tour}
              step={step}
              catalog={catalog}
            />
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
        {complete && <Title>{t('Tour completed')}</Title>}
        {!complete && nextId && (
          <Button onClick={() => router.push(contentHref(nextId))}>{t('Open next stop')}</Button>
        )}
        {destinationObjectId && (
          <Button variant="default" onClick={() => setDestination(null)}>
            {t('Resume tour route')}
          </Button>
        )}
        {routeUnavailable && <Box>{t('No route available between these objects')}</Box>}
        {!currentObjectId && <Box>{t('Open an object and set it as your position')}</Box>}
      </Group>
    </AppShellFooter>
  )
}

function NavigationControls({
  museum,
  firstPerson,
  onToggleFirstPerson,
  mapAvailable,
  tour,
  step,
  catalog,
}: {
  museum: Museum
  firstPerson: boolean
  onToggleFirstPerson: () => void
  mapAvailable: boolean
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
      <Box className="pointer-events-auto self-end p-2">
        <Button variant="default" disabled={!mapAvailable} onClick={onToggleFirstPerson}>
          {firstPerson ? t('Return to map') : t('Explore in first person')}
        </Button>
        {firstPerson && (
          <Box>{t('Click the map to look around. WASD to move, Esc to return.')}</Box>
        )}
      </Box>
      <Group
        gap="xs"
        wrap="nowrap"
        align="end"
        justify="space-around"
        className="p-2"
        style={{ pointerEvents: 'auto' }}
      >
        {museum.services && <ServicesActionIcons services={museum.services} />}

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
