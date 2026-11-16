/**
 * The museum's Info tab, read view: what a visitor needs to plan the visit,
 * grouped by what they are trying to do instead of listed field by field.
 *
 * - the description first, as prose;
 * - "Plan your visit": opening hours (with the live open/closed status),
 *   tickets, address with map and directions, accessibility;
 * - "Contacts" (phone, email, social profiles) and "News".
 *
 * From `md` the two groups sit side by side, the visit wider; on phones they
 * stack in that order. A block shows only when the museum entered its data,
 * and a group with no block left doesn't show either. Editing stays in the
 * enclosing `EditableSection`, which swaps this whole view for the form.
 */
import { MuseumLocationMap } from '@/components/location/MuseumLocationMap'
import { OpeningHours } from '@/components/mantine/OpeningHours'
import { SocialLinks } from '@/components/mantine/SocialLinks'
import { getT } from '@/i18n.server'
import { formatMuseumAddress, isMuseumPoint } from '@/lib/museum-location'
import { museumTimeZone } from '@/lib/museum-time-zone'
import { openingHoursRows } from '@/lib/opening-hours'
import type { Museum } from '@/payload-types'
import { ACCESSIBILITY_COLOR } from '@/theme'
import {
  Anchor,
  Box,
  Button,
  Grid,
  GridCol,
  Group,
  List,
  ListItem,
  Spoiler,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Typography,
} from '@mantine/core'
import {
  Accessibility,
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

/** The `t` of the museum-page namespace, handed to the parts below. */
type MuseumPageT = Awaited<ReturnType<typeof getT>>['t']

export async function MuseumInfo({
  museum,
  descriptionHTML,
}: {
  museum: Museum
  descriptionHTML: string | null
}) {
  const { t, lng } = await getT('museum-page')
  const visit = visitBlocks(museum, t, lng)
  const contacts = contactBlocks(museum, t)
  const news = [...(museum.news ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <Stack gap="xl">
      {/* Reading measure: the rest of the tab uses the container's width. */}
      <Box className="from-md:max-w-[75ch]">
        <Spoiler maxHeight={120} showLabel={t('Show more')} hideLabel={t('Hide')}>
          <Typography>
            {descriptionHTML ? (
              <div dangerouslySetInnerHTML={{ __html: descriptionHTML }} />
            ) : (
              <Text c="dimmed">{t('No description available')}</Text>
            )}
          </Typography>
        </Spoiler>
      </Box>
      <Grid gap={{ base: 'xl', md: 48 }} align="flex-start">
        <GridCol span={{ base: 12, md: 7 }}>
          <InfoGroup title={t('Plan your visit')}>{visit}</InfoGroup>
        </GridCol>
        {(contacts.length > 0 || news.length > 0) && (
          <GridCol span={{ base: 12, md: 5 }}>
            <Stack gap="xl">
              {contacts.length > 0 && (
                <InfoGroup title={t('Contacts')}>
                  <Stack gap="sm">{contacts}</Stack>
                </InfoGroup>
              )}
              {news.length > 0 && (
                <InfoGroup title={t('News')}>
                  <NewsItems news={news} t={t} lng={lng} />
                </InfoGroup>
              )}
            </Stack>
          </GridCol>
        )}
      </Grid>
    </Stack>
  )
}

/**
 * "Plan your visit": opening hours, tickets, address with its map and
 * directions, accessibility. Each block only when the museum gave its data
 * (the address always: every museum has one).
 */
function visitBlocks(museum: Museum, t: MuseumPageT, lng: string) {
  const hours = openingHoursRows(museum.openingHours, lng)
  const point = museum.location?.latlng
  const accessFeatures = confirmedAccess(museum.accessibility, t)
  return [
    (hours.length > 0 || museum.openingHours?.notes) && (
      <InfoBlock key="hours" icon={Clock} title={t('Opening hours')}>
        <OpeningHours
          hours={museum.openingHours}
          rows={hours}
          timeZone={museumTimeZone(point)}
          lng={lng}
        />
      </InfoBlock>
    ),
    museum.ticketInfo?.label && (
      <InfoBlock key="tickets" icon={Ticket} title={t('Tickets')}>
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{museum.ticketInfo.label}</Text>
          {museum.ticketInfo.url && (
            <Button
              component="a"
              href={museum.ticketInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              size="sm"
              rightSection={<ExternalLink size={14} aria-hidden />}
            >
              {t('Tickets and prices')}
            </Button>
          )}
        </Stack>
      </InfoBlock>
    ),
    <InfoBlock key="address" icon={MapPin} title={t('Address')}>
      <Stack gap="sm">
        <Group justify="space-between" align="center" gap="xs">
          <Text size="sm">{formatMuseumAddress(museum.location)}</Text>
          {isMuseumPoint(point) && (
            // Google Maps' public directions URL: no key, opens the phone's
            // maps app from the visitor's own position, the site elsewhere.
            <Button
              component="a"
              href={`https://www.google.com/maps/dir/?api=1&destination=${point[1]},${point[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              size="sm"
              leftSection={<Navigation size={14} aria-hidden />}
            >
              {t('Directions')}
            </Button>
          )}
        </Group>
        <MuseumLocationMap point={point} />
      </Stack>
    </InfoBlock>,
    accessFeatures.length > 0 && (
      <InfoBlock key="access" icon={Accessibility} title={t('Accessibility')}>
        <List
          spacing={4}
          size="sm"
          className="grid from-sm:grid-cols-2 gap-x-(--mantine-spacing-lg)"
          icon={
            <ThemeIcon size={18} radius="xl" variant="light" color={ACCESSIBILITY_COLOR}>
              <Check size={12} aria-hidden />
            </ThemeIcon>
          }
        >
          {accessFeatures.map((feature) => (
            <ListItem key={feature}>{feature}</ListItem>
          ))}
        </List>
      </InfoBlock>
    ),
  ].filter(Boolean)
}

/** Only the facilities the museum confirmed; unknown ones are left unsaid. */
function confirmedAccess(access: Museum['accessibility'], t: MuseumPageT) {
  return [
    access?.stepFreeEntrance && t('Step-free entrance'),
    access?.elevator && t('Elevator'),
    access?.accessibleBathrooms && t('Accessible toilets'),
    access?.tactilePaths && t('Tactile paths'),
    access?.audioGuides && t('Audio guides'),
    access?.signLanguage && t('Sign language'),
    access?.serviceAnimals && t('Service animals welcome'),
  ].filter((feature): feature is string => Boolean(feature))
}

/** "Contacts": phone, email and the social profiles, those the museum gave. */
function contactBlocks(museum: Museum, t: MuseumPageT) {
  const phone = phoneLink(museum.phone)
  const socials = museum.socials ?? []
  return [
    phone && (
      <ContactRow key="phone" icon={Phone} label={t('Phone')}>
        <Anchor href={`tel:${phone.dial}`} size="sm">
          {phone.shown}
        </Anchor>
      </ContactRow>
    ),
    museum.email && (
      <ContactRow key="email" icon={Mail} label={t('Email')}>
        <Anchor href={`mailto:${museum.email}`} size="sm" className="break-all">
          {museum.email}
        </Anchor>
      </ContactRow>
    ),
    socials.length > 0 && (
      <Stack key="socials" gap="xs">
        <Text size="sm" c="dimmed">
          {t('Follow the museum')}
        </Text>
        <SocialLinks socials={socials} />
      </Stack>
    ),
  ].filter(Boolean)
}

/**
 * The museum's phone, shown in international notation and dialled as E.164
 * (the form the phone field stores for `tel:` links). Older documents hold a
 * plain string: shown as typed, dialled with only its digits and `+`.
 */
function phoneLink(phone: Museum['phone']) {
  if (typeof phone === 'string') return { shown: phone, dial: phone.replace(/[^\d+]/g, '') }
  if (!phone?.international) return null
  return { shown: phone.international, dial: phone.e164 }
}

/**
 * The latest news. A news date is a day, which Payload's date picker stores
 * as 12:00 UTC of the picked day: formatted in UTC it is that day for every
 * visitor, where the server's or visitor's zone could shift it.
 */
function NewsItems({
  news,
  t,
  lng,
}: {
  news: NonNullable<Museum['news']>
  t: MuseumPageT
  lng: string
}) {
  const newsDate = new Intl.DateTimeFormat(lng, { dateStyle: 'medium', timeZone: 'UTC' })
  return news.map((item) => (
    <Stack key={item.id ?? item.title} gap={2} component="article">
      <Text size="xs" c="dimmed" component="time" dateTime={item.date}>
        {newsDate.format(new Date(item.date))}
      </Text>
      <Title order={4} size="h6">
        {item.title}
      </Title>
      <Spoiler maxHeight={66} showLabel={t('Show more')} hideLabel={t('Hide')}>
        <Text size="sm">{item.content}</Text>
      </Spoiler>
    </Stack>
  ))
}

/**
 * A group of the tab: an `h3` under the section's "About this museum" `h2`
 * (The One-Outline Rule), its blocks spaced well apart.
 */
function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="lg" component="section">
      <Title order={3} size="h5">
        {title}
      </Title>
      {children}
    </Stack>
  )
}

/**
 * One block of "Plan your visit": a dimmed icon and an `h4` label, the body
 * aligned under the label's text so the icons form a scannable column.
 */
function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap">
        <Icon size={18} aria-hidden className="shrink-0 text-(--mantine-color-dimmed)" />
        <Title order={4} size="h6">
          {title}
        </Title>
      </Group>
      <Box ps={28}>{children}</Box>
    </Stack>
  )
}

/** A contact as one row: the icon names the channel, the link does it. */
function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Icon
        size={18}
        aria-label={label}
        role="img"
        className="shrink-0 text-(--mantine-color-dimmed)"
      />
      {children}
    </Group>
  )
}
