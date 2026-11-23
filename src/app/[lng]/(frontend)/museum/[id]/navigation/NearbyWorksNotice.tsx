'use client'

import { ActionIcon, Button, Paper, UnstyledButton } from '@mantine/core'
import { ChevronRight, Compass, FlagTriangleRight, ImageOff, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NAVIGATION_COMPACT_ACTION_CLASS, NAVIGATION_HIT_AREA } from './navigation-touch'

export type NearbyWork = { id: string; name: string; thumbnail?: string | null; next: boolean }

/**
 * A compact, nonmodal recognition choice over the map, sized like a list:
 * one short heading line, then one row per work. Opening and confirming stay
 * separate actions: the row itself opens the work (a list item's usual tap),
 * "I'm here" beside it confirms the position. It covers as little of the map
 * as a notice can while every target keeps 44 px (compact controls carry an
 * invisible hit ring, see `navigation-touch.ts`). Its height cap is svh,
 * not dvh: svh equals dvh at load and never grows when the browser
 * collapses its URL bar mid-scroll, so the list stays put over the map.
 */
export function NearbyWorksNotice({
  works,
  onOpen,
  onConfirm,
  onDismiss,
}: {
  works: NearbyWork[]
  onOpen: (id: string) => void
  onConfirm: (id: string) => void
  onDismiss: () => void
}) {
  const { t } = useTranslation('tour-navigation')
  if (!works.length) return null
  const next = works.some((work) => work.next)
  const Icon = next ? FlagTriangleRight : Compass
  let heading = t('Which work is in front of you?')
  if (works.length <= 1)
    heading = next ? t('Your next stop is nearby') : t('Discover a nearby work')
  return (
    <Paper
      className="pointer-events-auto max-h-[45svh] w-full max-w-sm overflow-auto rounded-md border border-(--mantine-color-default-border) bg-(--mantine-color-body) px-2 py-1.5 shadow-md"
      role="region"
      aria-label={t('Works near you')}
    >
      <div className="flex items-center gap-1.5 ps-1">
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <h2 className="m-0 grow text-xs font-semibold" aria-live="polite">
          {heading}
        </h2>
        <ActionIcon
          size={32}
          variant="subtle"
          className={NAVIGATION_HIT_AREA}
          aria-label={t('Dismiss nearby works')}
          onClick={onDismiss}
        >
          <X size={16} />
        </ActionIcon>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {works.map((work) => (
          <li key={work.id} className="flex items-center gap-1">
            <UnstyledButton
              aria-label={t('Open {{name}}', { name: work.name })}
              onClick={() => onOpen(work.id)}
              className="flex min-h-11 min-w-0 grow items-center gap-2 rounded-sm p-1 hover:bg-(--mantine-color-default-hover)"
            >
              <WorkThumbnail key={work.thumbnail} src={work.thumbnail} />
              <span className="min-w-0 grow">
                <span className="block truncate text-sm font-semibold">{work.name}</span>
                {/* The next stop says so in the museum colour, the one
                    accent: it is the work the route leads to. */}
                <span
                  className={`block text-xs ${work.next ? 'text-(--mantine-color-museum-light-color)' : 'text-(--mantine-color-dimmed)'}`}
                >
                  {work.next ? t('Next stop') : t('Nearby discovery')}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden className="shrink-0 opacity-60" />
            </UnstyledButton>
            <Button
              className={`${NAVIGATION_COMPACT_ACTION_CLASS} shrink-0`}
              size="compact-sm"
              variant="light"
              color={work.next ? 'museum.8' : 'gray'}
              aria-label={t('Confirm position at {{name}}', { name: work.name })}
              onClick={() => onConfirm(work.id)}
            >
              {t("I'm here")}
            </Button>
          </li>
        ))}
      </ul>
    </Paper>
  )
}

/** A missing/failed thumbnail never hides the name or the two actions. */
function WorkThumbnail({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--mantine-color-default-hover)">
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff size={18} aria-hidden="true" />
      )}
    </span>
  )
}
