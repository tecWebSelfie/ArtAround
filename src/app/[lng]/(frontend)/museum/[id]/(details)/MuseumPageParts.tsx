import { MuseumLocationMap } from '@/components/location/MuseumLocationMap'
import { EditableSection } from '@/components/editing/EditableSection'
import { MuseumAppearanceForm } from '@/components/editing/forms/MuseumAppearanceForm'
import { MuseumMetadataForm } from '@/components/editing/forms/MuseumMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ArtaroundDataList } from '@/components/mantine/ArtaroundDataList'
import { getT } from '@/i18n.server'
import { lexicalToHTML } from '@/lib/richtext'
import { formatMuseumAddress } from '@/lib/museum-location'
import { openingHoursRows } from '@/lib/opening-hours'
import { Museum } from '@/payload-types'
import { ACCESSIBILITY_COLOR } from '@/theme'
import {
  Anchor,
  Box,
  Button,
  ColorSwatch,
  Group,
  List,
  ListItem,
  Spoiler,
  Stack,
  Text,
  ThemeIcon,
  Typography,
} from '@mantine/core'
import {
  Check,
  ExternalLink,
  FilePlus,
  Map as MapIcon,
  QrCode,
  Route as Route_,
  Users,
} from 'lucide-react'
import type { Route } from 'next'
import type { ReactNode } from 'react'

import type { MuseumEditing } from './MuseumPage'

/** Parts of the museum page (`MuseumPage.tsx`): its edit actions and its Info tab. */

/**
 * The staff's ways in: complex relations get dedicated pages (the map
 * editor, a new tour or content, the staff list, the objects' QR sheet);
 * metadata is edited in place (Info tab).
 */
export async function MuseumEditActions({
  museumId,
  editing,
}: {
  museumId: string
  editing: MuseumEditing
}) {
  if (!editing.isSignedIn && !editing.canManageMap) return null
  const { t: te } = await getT('editing')
  const { t: tc } = await getT('common')
  const base = `/${editing.lng}`
  return (
    <Group gap="xs">
      {editing.canManageMap && (
        <LinkButton
          href={`${base}/museum/${museumId}/edit/mapeditor` as Route}
          variant="light"
          size="xs"
          leftSection={<MapIcon size={14} />}
        >
          {te('Add objects to the map')}
        </LinkButton>
      )}
      {editing.isSignedIn && (
        <LinkButton
          href={`${base}/tour/new?museum=${museumId}` as Route}
          variant="light"
          size="xs"
          leftSection={<Route_ size={14} />}
        >
          {te('Add tour')}
        </LinkButton>
      )}
      {editing.isSignedIn && (
        <LinkButton
          href={`${base}/content/new` as Route}
          variant="light"
          size="xs"
          leftSection={<FilePlus size={14} />}
        >
          {te('Add content')}
        </LinkButton>
      )}
      {editing.canManageMap && (
        <LinkButton
          href={`${base}/museum/${museumId}/members` as Route}
          variant="subtle"
          size="xs"
          leftSection={<Users size={14} />}
        >
          {te('Staff')}
        </LinkButton>
      )}
      {editing.canManageMap && (
        // A sheet of labels, one QR per object on the map, in the
        // page's language (`/api/qr-sheet`). Scanned on site, each
        // opens the app in this museum. A plain download link.
        <Button
          component="a"
          href={`/api/qr-sheet?kind=museum&id=${museumId}&lng=${editing.lng}`}
          download
          variant="subtle"
          size="xs"
          leftSection={<QrCode size={14} aria-hidden />}
        >
          {tc('Print the QR codes of all objects')}
        </Button>
      )}
    </Group>
  )
}

/** One optional row of the facts list: present only when the museum gave it. */
const row = (given: unknown, label: string, value: ReactNode) => (given ? { [label]: value } : {})

/**
 * The Info tab: description, address with its map, and the visit's
 * practical facts (hours, tickets, contacts, news, accessibility), each only
 * when the museum gave it; then, for the director, the museum's color.
 */
export async function MuseumInfo({ museum, editing }: { museum: Museum; editing?: MuseumEditing }) {
  const { t, lng } = await getT('museum-page')
  const { t: te } = await getT('editing')
  const descriptionHTML = lexicalToHTML(museum.description) || null
  // Only the facilities the museum confirmed; unknown ones are left unsaid.
  const access = museum.accessibility
  const accessFeatures = [
    access?.stepFreeEntrance && t('Step-free entrance'),
    access?.elevator && t('Elevator'),
    access?.accessibleBathrooms && t('Accessible toilets'),
    access?.tactilePaths && t('Tactile paths'),
    access?.audioGuides && t('Audio guides'),
    access?.signLanguage && t('Sign language'),
    access?.serviceAnimals && t('Service animals welcome'),
  ].filter((feature): feature is string => Boolean(feature))
  // Planning the visit: when it's open, what it costs, how to reach the
  // museum, what's new. All optional museum fields; empty ones say nothing.
  const hours = openingHoursRows(museum.openingHours, lng)
  const phone = phoneLink(museum.phone)
  const socials = museum.socials ?? []
  const news = [...(museum.news ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  return (
    // Reading measure on desktop; the pencil stays at the trailing
    // edge of the section it edits.
    <Box maw={{ md: '75ch' }}>
      <EditableSection
        title={te('About this museum')}
        canEdit={Boolean(editing?.canEditDetails)}
        form={
          editing && (
            <MuseumMetadataForm
              museum={editing.source}
              descriptionHTML={editing.source.descriptionHTML}
            />
          )
        }
      >
        <ArtaroundDataList
          data={{
            [t('Description')]: (
              <Spoiler maxHeight={80} showLabel={t('Show more')} hideLabel={t('Hide')}>
                <Typography>
                  {!descriptionHTML ? (
                    t('No description available')
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: descriptionHTML }}></div>
                  )}
                </Typography>
              </Spoiler>
            ),
            [t('Address')]: (
              <Stack gap="sm">
                <Text>{formatMuseumAddress(museum.location)}</Text>
                <MuseumLocationMap point={museum.location.latlng} />
              </Stack>
            ),
            ...row(
              hours.length || museum.openingHours?.notes,
              t('Opening hours'),
              <HoursList
                hours={hours}
                notes={museum.openingHours?.notes}
                closed={t('Closed')}
                localTime={t('Local time at the museum')}
              />,
            ),
            ...row(
              museum.ticketInfo?.label,
              t('Tickets'),
              <Stack gap={4}>
                <Text size="sm">{museum.ticketInfo?.label}</Text>
                {museum.ticketInfo?.url && (
                  <Anchor
                    href={museum.ticketInfo?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    className="inline-flex items-center gap-1 self-start"
                  >
                    {t('Tickets and prices on the museum’s site')}
                    <ExternalLink size={14} aria-hidden />
                  </Anchor>
                )}
              </Stack>,
            ),
            ...row(
              phone,
              t('Phone'),
              <Anchor href={`tel:${phone?.dial}`} size="sm">
                {phone?.shown}
              </Anchor>,
            ),
            ...row(museum.email, t('Email'), museum.email),
            ...row(socials.length, t('Follow the museum'), <SocialLinks socials={socials} />),
            ...row(news.length, t('News'), <NewsList news={news} lng={lng} />),
            ...row(
              accessFeatures.length,
              t('Accessibility'),
              <AccessList features={accessFeatures} />,
            ),
          }}
        />
      </EditableSection>
      {/* The museum's color: only for the people who can change it
          (director); visitors just see the app wearing it. */}
      {editing?.canEditDetails && (
        <Box mt="xl">
          <EditableSection
            title={te('Museum color')}
            canEdit
            form={<MuseumAppearanceForm museum={editing.source} />}
          >
            <Group gap="xs">
              {museum.brandColor && <ColorSwatch color={museum.brandColor} size={20} aria-hidden />}
              <Text size="sm">{museum.brandColor ? museum.brandColor : te('Default blue')}</Text>
            </Group>
          </EditableSection>
        </Box>
      )}
    </Box>
  )
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

/** The week's opening hours, in the museum's own local time, and its notes. */
function HoursList({
  hours,
  notes,
  closed,
  localTime,
}: {
  hours: { day: string; ranges: string }[]
  notes?: string | null
  closed: string
  localTime: string
}) {
  return (
    <Stack gap={4}>
      {hours.map(({ day, ranges }) => (
        <Group key={day} gap="md" wrap="nowrap">
          <Text size="sm" w="7em" c="dimmed">
            {day}
          </Text>
          <Text size="sm" className="tabular-nums">
            {ranges || closed}
          </Text>
        </Group>
      ))}
      {/* Visitors abroad shouldn't convert them. */}
      {hours.length > 0 && (
        <Text size="xs" c="dimmed">
          {localTime}
        </Text>
      )}
      {notes && (
        <Text size="sm" c="dimmed">
          {notes}
        </Text>
      )}
    </Stack>
  )
}

/** The museum's social profiles, each by its platform's name. */
function SocialLinks({ socials }: { socials: NonNullable<Museum['socials']> }) {
  return (
    <Group gap="md">
      {socials.map((social) => (
        <Anchor
          key={social.id ?? social.url}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          {social.platform}
        </Anchor>
      ))}
    </Group>
  )
}

/**
 * The latest news. A news date is a day, which Payload's date picker stores
 * as 12:00 UTC of the picked day: formatted in UTC it is that day for every
 * visitor, where the server's or visitor's zone could shift it.
 */
function NewsList({ news, lng }: { news: NonNullable<Museum['news']>; lng: string }) {
  const newsDate = new Intl.DateTimeFormat(lng, { dateStyle: 'medium', timeZone: 'UTC' })
  return (
    <Stack gap="sm">
      {news.map((item) => (
        <Stack key={item.id ?? item.title} gap={2}>
          <Text size="xs" c="dimmed">
            {newsDate.format(new Date(item.date))}
          </Text>
          <Text size="sm" fw={600}>
            {item.title}
          </Text>
          <Text size="sm">{item.content}</Text>
        </Stack>
      ))}
    </Stack>
  )
}

/** The facilities the museum confirmed, each with the accessibility check. */
function AccessList({ features }: { features: string[] }) {
  return (
    <List
      spacing={4}
      size="sm"
      icon={
        <ThemeIcon size={18} radius="xl" variant="light" color={ACCESSIBILITY_COLOR}>
          <Check size={12} aria-hidden />
        </ThemeIcon>
      }
    >
      {features.map((feature) => (
        <ListItem key={feature}>{feature}</ListItem>
      ))}
    </List>
  )
}
