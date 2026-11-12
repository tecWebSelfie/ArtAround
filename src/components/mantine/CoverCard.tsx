'use client'

import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { CarouselSlide } from '@mantine/carousel'
import { AspectRatio, Stack, Title } from '@mantine/core'
import { cn } from 'cn'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The square cover card of the swipeable rows (`ContentsCarousel`,
 * `ObjectsCarousel`, the navigator home's `DiscoverRail`): one carousel slide
 * holding one link, the cover photo under a bottom scrim that keeps the white
 * title and figures readable on any picture. The outline names the kind
 * (teal contents, grape tours, a museum's own color) and is optional.
 *
 * The picture is a CSS background with its URL quoted: Mantine's
 * `BackgroundImage` writes `url(${src})` bare, which a URL with parentheses
 * or spaces (an upload named "photo (1).jpg") breaks.
 */
export function CoverCard({
  href,
  imageUrl,
  title,
  outline,
  children,
}: {
  href: Route
  imageUrl: string | null | undefined
  title: string
  /** A CSS color for the 2px outline; `null` for the default border, `undefined` for none. */
  outline?: string | null
  /** The figures under the title (kind-specific). */
  children?: ReactNode
}) {
  return (
    <CarouselSlide>
      <Link
        href={href}
        className="block rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)"
      >
        <AspectRatio ratio={1 / 1}>
          <div
            className={cn(
              'overflow-hidden rounded-xl bg-cover bg-center transition-transform duration-300 hover:scale-[1.02]',
              outline !== undefined &&
                'border-2 border-solid border-(--mantine-color-default-border)',
            )}
            // The picture and a kind's or museum's color are data: inline.
            style={{
              backgroundImage: `url(${JSON.stringify(imageUrl ?? PLACEHOLDER_IMAGE)})`,
              ...(outline && { borderColor: outline }),
            }}
          >
            <Stack
              justify="flex-end"
              gap={6}
              className="h-full bg-linear-to-t from-black/75 via-black/15 to-transparent"
              p="sm"
            >
              <Title order={3} size="h6" c="white" lineClamp={2}>
                {title}
              </Title>
              {children}
            </Stack>
          </div>
        </AspectRatio>
      </Link>
    </CarouselSlide>
  )
}
