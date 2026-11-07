'use client'

import { ActionIcon, Button, Paper } from '@mantine/core'
import { Compass, FlagTriangleRight, ImageOff, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NAVIGATION_ACTION_CLASS } from './navigation-touch'

export type NearbyWork = { id: string; name: string; thumbnail?: string | null; next: boolean }

/** A compact, nonmodal recognition choice; opening and confirming are separate actions. */
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
  return (
    <Paper
      className="pointer-events-auto max-h-[45dvh] w-full max-w-sm overflow-auto rounded-md border border-(--mantine-color-default-border) bg-(--mantine-color-body) p-3 shadow-md"
      role="region"
      aria-label={t('Works near you')}
    >
      <div className="mb-2 flex items-start gap-2">
        <Icon size={20} className="mt-1 shrink-0" aria-hidden="true" />
        <h2 className="grow text-sm font-semibold" aria-live="polite">
          {works.length > 1
            ? t('Which work is in front of you?')
            : next
              ? t('Your next stop is nearby')
              : t('Discover a nearby work')}
        </h2>
        <ActionIcon
          size={44}
          variant="subtle"
          aria-label={t('Dismiss nearby works')}
          onClick={onDismiss}
        >
          <X size={18} />
        </ActionIcon>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {works.map((work) => (
          <li key={work.id} className="flex items-start gap-2">
            <WorkThumbnail key={work.thumbnail} src={work.thumbnail} />
            <div className="min-w-0 grow">
              <p className="m-0 text-sm font-semibold break-words">{work.name}</p>
              <p className="mb-2 text-xs">{work.next ? t('Next stop') : t('Nearby discovery')}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className={NAVIGATION_ACTION_CLASS}
                  size="sm"
                  autoContrast
                  variant={work.next ? 'filled' : 'default'}
                  // The deeper primary shade preserves museum identity and AA contrast.
                  color={work.next ? 'museum.8' : undefined}
                  aria-label={t('Open {{name}}', { name: work.name })}
                  onClick={() => onOpen(work.id)}
                >
                  {t('Open')}
                </Button>
                <Button
                  className={NAVIGATION_ACTION_CLASS}
                  size="sm"
                  variant="subtle"
                  aria-label={t('Confirm position at {{name}}', { name: work.name })}
                  onClick={() => onConfirm(work.id)}
                >
                  {t('I am here')}
                </Button>
              </div>
            </div>
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--mantine-color-default-hover)">
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff size={24} aria-hidden="true" />
      )}
    </div>
  )
}
