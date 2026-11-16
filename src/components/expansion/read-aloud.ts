'use client'

import { speakableText } from '@/lib/expansion'

/**
 * The generated texts on screen that "Listen" reads after the content's own
 * audio. `ContentAudioButton` plays the stored MP3 of the base text (or the
 * chosen version), then goes on with every "Tell me more" step the visitor
 * has opened so far, as `/api/speech` requests: they are generated on demand
 * and never stored as audio.
 *
 *   ExpansionText (kind 'more') ── register(element, paragraphs, done) ──▶ store
 *   ContentAudioButton ── MP3 ends ──▶ nextChunk() in page order ──▶ speak
 *
 * A module store, not a context: the button and the expansions are siblings
 * in server-rendered modals, and only one content modal is open at a time.
 * Page order comes from the registered elements, so the steps are read the
 * way they are stacked whatever order they mounted in.
 */

type Entry = { element: HTMLElement; paragraphs: string[]; done: boolean }

const entries = new Map<symbol, Entry>()

/** Adds or updates a mounted expansion; returns its removal. */
export function registerExpansion(id: symbol, entry: Entry) {
  entries.set(id, entry)
  return () => void entries.delete(id)
}

/** The registered expansions in page order (top to bottom). */
function ordered() {
  return [...entries.values()].sort((a, b) =>
    a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  )
}

/**
 * Every speakable chunk of the expansions on screen, in order, plus whether
 * one is still streaming (more chunks may follow).
 */
export function expansionChunks() {
  const list = ordered()
  return {
    chunks: list.flatMap((entry) => entry.paragraphs.flatMap((p) => speechChunks(p))),
    pending: list.some((entry) => !entry.done),
  }
}

/** Speech requests are capped at 600 characters; long paragraphs go by sentences. */
export function speechChunks(paragraph: string, max = 550) {
  const chunks: string[] = []
  let current = ''
  for (const sentence of speakableText(paragraph).match(/[^.!?]+[.!?]*\s*/g) ?? []) {
    if (current && (current + sentence).length > max) {
      chunks.push(current.trim())
      current = ''
    }
    current += sentence
  }
  if (current.trim()) chunks.push(current.trim().slice(0, max))
  return chunks
}
