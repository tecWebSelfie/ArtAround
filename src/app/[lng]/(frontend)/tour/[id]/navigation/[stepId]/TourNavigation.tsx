import { MapViewer } from '@/components/pascal/MapViewer'
import { filterPopulated } from '@/lib/isPopulated'
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
import { Suspense } from 'react'
import { TourProgress } from './TourProgress'

export const TourNavigationPage = ({
  tour,
  step,
  museum,
}: { tour: Tour; step: number; museum: Museum } & Omit<AppShellMainProps, 'step'>) => {
  const museumMap = validateBuildJson(
    typeof tour.museum?.docs?.[0] === 'object' ? tour.museum?.docs?.[0].map : null,
  )
  const contents = filterPopulated(tour.contents)

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
                aria-label="Avanzamento del tour"
                size={'xs'}
                value={(step / contents.length) * 100}
              />
            </GridCol>
            <GridCol span={1}>
              <FlagBannerFoldIcon size={14} />
            </GridCol>
          </Grid>
          <TourProgress contents={contents} step={step} tourId={tour.id} />
        </Stack>
      </AppShellHeader>

      <AppShellMain h="100dvh" className={`overflow-hidden`}>
        <Box pos="relative" h="100%">
          <Suspense fallback={<div>Loading...</div>}>
            {museumMap.parsed ? (
              <MapViewer map={museumMap.parsed} h="100%" w="100%" />
            ) : (
              <div>Map not available</div>
            )}
          </Suspense>
          <Overlay backgroundOpacity={0} style={{ pointerEvents: 'none' }}>
            <NavigationControls museum={museum} />
          </Overlay>
        </Box>
      </AppShellMain>

      <NavigationNavBar />
    </>
  )
}

function NavigationNavBar() {
  return (
    <AppShellFooter className="rounded-t-md">
      <Group grow p="xs" align="center">
        <Title>prova</Title>
      </Group>
    </AppShellFooter>
  )
}

function NavigationControls({ museum }: { museum: Museum }) {
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

        <Button
          size="compact-xl"
          rightSection={<ScanQrCode size={24} />}
          color="dark"
          className="rounded-full"
        >
          Scansiona
        </Button>
        <ActionIcon
          aria-label="Cerca"
          variant="white"
          autoContrast
          radius={'xl'}
          size={'lg'}
          className="p-1.5"
          onClick={spotlight.open}
        >
          <Search className="size-full" />
        </ActionIcon>
        <Spotlight actions={[]} nothingFound="Nessun risultato trovato" />
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
