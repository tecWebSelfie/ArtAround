'use client'

import { useSharedSpeech } from '@/components/assistant/speech-context'
import {
  finishedParagraphs,
  inlineParts,
  type InlinePart,
  linkedIds,
  LINKS_HEADER,
  type ExpansionLink,
  type ExpansionRequest,
} from '@/lib/expansion'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import {
  museumNavigationPath,
  parseNavigationPathname,
  tourNavigationPath,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { Anchor, Group, Image, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import type { Route } from 'next'
import Link from 'next/link'
import { ProgressLink } from '@/components/navigation/ProgressLink'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from './ContentExpansion.module.css'
import { registerExpansion, speechChunks } from './read-aloud'

/**
 * Shows a text from `/api/expand` the way the museum's own text looks.
 * Used by "Tell me more" (`ContentExpansion`, after the body) and by the
 * other versions of a content (`ContentVersion`, in place of the body).
 *
 *   request → stream from /api/expand → finished paragraphs fade in
 *   → (voice assistant on) each paragraph is read aloud, in order
 *   → when done, linked museum entities appear as small thumbnails
 */

type Expansion = { text: string; done: boolean; failed: boolean; links: ExpansionLink[] }

const EMPTY: Expansion = { text: '', done: false, failed: false, links: [] }

/** Streams one request's text; a new request (or closing the modal) cancels the old one. */
function useExpansion(target: 'contents' | 'objects', id: string, request: ExpansionRequest) {
  const { lng } = useParams<{ lng: string }>()
  const key = JSON.stringify(request)
  // Remembers which request the text belongs to: a new request shows the
  // empty state at once, without resetting state inside the effect.
  const [state, setState] = useState<Expansion & { key: string }>({ ...EMPTY, key: '' })

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, id, lng, request: JSON.parse(key) }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(String(response.status))
        const links = JSON.parse(
          decodeURIComponent(response.headers.get(LINKS_HEADER) ?? '%5B%5D'),
        ) as ExpansionLink[]
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let text = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          text += value
          setState({ text, done: false, failed: false, links, key })
        }
        setState({ text, done: true, failed: !text.trim(), links, key })
      } catch {
        if (!controller.signal.aborted) setState({ ...EMPTY, done: true, failed: true, key })
      }
    })()
    return () => controller.abort()
  }, [target, id, lng, key])

  return state.key === key ? state : EMPTY
}

/** Reads new paragraphs aloud, in order, while the visitor has the assistant on. */
function useReadAloud(paragraphs: string[], key: string) {
  const speech = useSharedSpeech()
  const [assistantOn] = useLocalStorage({ key: 'aa-assistant', defaultValue: false })
  const spoken = useRef(0)
  const queue = useRef(Promise.resolve())
  // Each request gets a new run number; chunks queued for an older run are skipped.
  const run = useRef(0)
  useEffect(() => {
    run.current += 1
    spoken.current = 0
    queue.current = Promise.resolve()
  }, [key])
  useEffect(() => {
    if (!speech || !assistantOn) return
    const current = run.current
    for (const paragraph of paragraphs.slice(spoken.current)) {
      for (const chunk of speechChunks(paragraph)) {
        queue.current = queue.current
          .then(() => (run.current === current ? speech.speak(chunk) : undefined))
          .catch(() => {})
      }
    }
    spoken.current = paragraphs.length
  }, [paragraphs, speech, assistantOn])
  // Closing the modal or asking for another text silences the old one.
  const stop = speech?.stop
  useEffect(
    () => () => {
      run.current += 1
      stop?.()
    },
    [key, stop],
  )
}

export function ExpansionText({
  target,
  id,
  request,
}: {
  target: 'contents' | 'objects'
  id: string
  request: ExpansionRequest
}) {
  const { t } = useTranslation('tour-navigation')
  const search = useSearchParams()
  const { lng } = useParams<{ lng: string }>()
  // The museum navigation the text is read in, if any: free map or a tour step.
  const here = parseNavigationPathname(usePathname())
  const expansion = useExpansion(target, id, request)
  const paragraphs = finishedParagraphs(expansion.text, expansion.done)
  useReadAloud(paragraphs, JSON.stringify(request))
  // "Tell me more" steps join what "Listen" reads after the content's audio
  // (`read-aloud.ts`); a version already is that audio, so it stays out.
  const box = useRef<HTMLDivElement>(null)
  const [entryId] = useState(() => Symbol('expansion'))
  useEffect(() => {
    if (request.kind !== 'more' || !box.current) return
    return registerExpansion(entryId, {
      element: box.current,
      paragraphs,
      done: expansion.done,
    })
  }, [entryId, request.kind, paragraphs, expansion.done])

  // Links open the linked entity's modal over the current map (tour step or
  // free navigation), keeping the position; elsewhere its canonical page.
  // Contextual URLs, not canonical ones: from below `/museum/[id]` the museum
  // details page's `@object` interceptor could catch a canonical object link.
  // Inside the map's contextual modals a link only swaps the modal (the map
  // stays), so it must not light the page bar; elsewhere it opens a page.
  const LinkKind = here ? Link : ProgressLink
  const hrefFor = (kind: 'object' | 'content', linkId: string) => {
    if (!here) return `/${lng}/${kind}/${linkId}` as Route
    const base =
      here.tourId && here.step !== null
        ? tourNavigationPath(here.lng, here.museumId, here.tourId, Number(here.step))
        : museumNavigationPath(here.lng, here.museumId)
    return withNavigationPosition(`${base}/${kind}/${linkId}`, search.toString()) as Route
  }
  const known = new Set(expansion.links.map((link) => link.id))
  // A link to a known entity, bold text, or plain text (an unknown link
  // reads as text: the model may name an id it wasn't given).
  const renderPart = (part: InlinePart, key: number) => {
    if (part.type === 'link' && known.has(part.id)) {
      // Real links (not buttons + router.push), so Cmd/Ctrl+click and
      // middle-click open the entity in a new tab.
      return (
        <Anchor key={key} component={LinkKind} href={hrefFor(part.kind, part.id)} inherit>
          {part.text}
        </Anchor>
      )
    }
    if (part.type === 'text' && part.bold) return <strong key={key}>{part.text}</strong>
    return <span key={key}>{part.text}</span>
  }
  const linked = expansion.done
    ? linkedIds(expansion.text).flatMap((linkId) => {
        const link = expansion.links.find((candidate) => candidate.id === linkId)
        return link ? [link] : []
      })
    : []

  return (
    <div ref={box} aria-live="polite" aria-busy={!expansion.done}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={classes.paragraph}>
          {inlineParts(paragraph).map(renderPart)}
        </p>
      ))}
      {/* Until the first paragraph is finished, the page shows it is loading. */}
      {!expansion.done && paragraphs.length === 0 && (
        <Stack gap={8} my="sm" aria-label={t('Loading')}>
          <Skeleton height={10} radius="sm" />
          <Skeleton height={10} radius="sm" />
          <Skeleton height={10} width="70%" radius="sm" />
        </Stack>
      )}
      {expansion.failed && (
        <Text size="sm" c="dimmed" my="sm">
          {t('This is not available right now. Try again in a minute.')}
        </Text>
      )}
      {linked.length > 0 && (
        <Group gap="sm" mt="xs" className={classes.paragraph}>
          {linked.map((link) => (
            <UnstyledButton
              key={link.id}
              component={LinkKind}
              href={hrefFor(link.kind, link.id)}
              className={classes.linked}
            >
              <Image
                src={link.thumbnail}
                fallbackSrc={PLACEHOLDER_IMAGE}
                alt=""
                w={48}
                h={48}
                radius="md"
                fit="cover"
              />
              <Text size="xs" fw={600} lineClamp={2}>
                {link.title}
              </Text>
            </UnstyledButton>
          ))}
        </Group>
      )}
    </div>
  )
}
