'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSpeech } from './use-speech'

/**
 * One speech player for the whole tour navigation (map, navbar orb and the
 * modal slot). Sharing it means that text read aloud from a modal ("Tell me
 * more") makes the orb pulse too, and that new speech always stops the
 * previous one instead of two voices talking over each other.
 */
const SpeechContext = createContext<ReturnType<typeof useSpeech> | null>(null)

export function SpeechProvider({ children }: { children: ReactNode }) {
  const speech = useSpeech()
  return <SpeechContext.Provider value={speech}>{children}</SpeechContext.Provider>
}

/** The shared player, or `null` outside tour navigation (canonical pages, stories). */
export const useSharedSpeech = () => useContext(SpeechContext)
