/**
 * A museum's social profiles as round icon links, the platform recognized
 * from the link's address (the `platform` field is free text, so "IG",
 * "instagram" and "Instagram" all happen). Brand marks come from Phosphor,
 * since lucide dropped its brand icons; an unknown site gets a globe. The
 * platform name the museum typed stays the link's accessible name and
 * tooltip, so nothing depends on recognizing the icon.
 */
import { ActionIcon, Group, Tooltip } from '@mantine/core'
import {
  FacebookLogoIcon,
  GlobeIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MastodonLogoIcon,
  PinterestLogoIcon,
  SpotifyLogoIcon,
  ThreadsLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} from '@phosphor-icons/react/ssr'
import type { Icon } from '@phosphor-icons/react'

// Host (without `www.`) → mark. Mastodon has no single host: its name is
// matched in the typed platform instead.
const BY_HOST: [hosts: string[], icon: Icon][] = [
  [['instagram.com'], InstagramLogoIcon],
  [['facebook.com', 'fb.com'], FacebookLogoIcon],
  [['x.com', 'twitter.com'], XLogoIcon],
  [['tiktok.com'], TiktokLogoIcon],
  [['youtube.com', 'youtu.be'], YoutubeLogoIcon],
  [['linkedin.com'], LinkedinLogoIcon],
  [['threads.net', 'threads.com'], ThreadsLogoIcon],
  [['pinterest.com', 'pinterest.it'], PinterestLogoIcon],
  [['spotify.com'], SpotifyLogoIcon],
]

function socialIcon(url: string, platform: string): Icon {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // A malformed address keeps the generic mark.
  }
  const match = BY_HOST.find(([hosts]) =>
    hosts.some((known) => host === known || host.endsWith(`.${known}`)),
  )
  if (match) return match[1]
  return /mastodon/i.test(platform) ? MastodonLogoIcon : GlobeIcon
}

export function SocialLinks({
  socials,
}: {
  socials: { id?: string | null; platform: string; url: string }[]
}) {
  return (
    <Group gap="xs">
      {socials.map((social) => {
        const SocialIcon = socialIcon(social.url, social.platform)
        return (
          <Tooltip key={social.id ?? social.url} label={social.platform} withArrow>
            {/* 44px: a comfortable touch target for an icon-only link. */}
            <ActionIcon
              component="a"
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="default"
              radius="xl"
              size={44}
              aria-label={social.platform}
            >
              <SocialIcon size={20} aria-hidden />
            </ActionIcon>
          </Tooltip>
        )
      })}
    </Group>
  )
}
