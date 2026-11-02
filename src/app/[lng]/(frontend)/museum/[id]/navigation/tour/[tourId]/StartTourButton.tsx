'use client'

import { BorderAnimate, BorderAnimateProps } from '@gfazioli/mantine-border-animate'
import { Group, Text, UnstyledButton } from '@mantine/core'
import { cn } from 'cn'
import { PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { tourNavigationPath } from '@/lib/tour-navigation'

/**
 * Starts a fresh tour at cursor zero using the active locale's shareable route
 * (inside the tour's museum navigation, `tourNavigationPath`).
 * A client component: it hands `Link` to Mantine as `component`, and functions
 * can't cross from a server component into client ones.
 */
export const StartTourButton = ({
  museumId,
  tourId,
  ...props
}: { museumId: string; tourId: string } & BorderAnimateProps) => {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  return (
    <BorderAnimate
      {...props}
      variant="draw"
      borderWidth={'sm'}
      className={cn('transition hover:scale-105', props.className)}
    >
      <UnstyledButton
        component={Link}
        href={tourNavigationPath(lng, museumId, tourId, 0)}
        className="p-2"
      >
        <Group align="center" gap="xs" justify="center">
          <Text
            className="font-semibold"
            variant="gradient"
            gradient={{ from: 'grape.8', to: 'orange.8' }}
          >
            {t('Start Tour')}
          </Text>
          <PlayCircle size={24} />
        </Group>
      </UnstyledButton>
    </BorderAnimate>
  )
}
