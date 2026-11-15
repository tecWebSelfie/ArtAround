'use client'

import { type PlannedTour, type PlanRequest } from '@/lib/tour-plan'
import { tourNavigationPath } from '@/lib/tour-navigation'
import { readerFor, setReadingProfile } from '@/lib/reading-profile'
import type { Route } from 'next'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EMPTY,
  STORAGE_KEY,
  store,
  useDictation,
  type Answers,
  type Museum,
} from './plan-visit-state'

/**
 * The plan page's state and actions: the stored answers and their setters,
 * dictation into the interests, submitting to `/api/plan-tour`, and the
 * preview as a URL state (`?tour={id}`, pushed so Back is "Change").
 */
export function usePlanVisit(museums: Museum[], lockedMuseum: string | null) {
  const { t } = useTranslation('plan-visit')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tourParam = searchParams.get('tour')

  // `null` until hydration: the server and the first render show the
  // defaults, and before that `?tour=` can't be judged.
  const stored = store.useValue(STORAGE_KEY)
  const restored = stored !== null
  const { plan } = stored ?? EMPTY
  // In museum mode the locked museum always wins over a stored choice.
  const answers: Answers = {
    ...(stored ?? EMPTY).answers,
    museumId: lockedMuseum ?? (stored ?? EMPTY).answers.museumId,
  }
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ageError, setAgeError] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // Whether this page pushed the `?tour=` entry, so "Change" can pop it.
  const pushedPreview = useRef(false)
  const previewHeading = useRef<HTMLHeadingElement>(null)

  // Updaters read the latest stored answers, so an async one (dictation)
  // never overwrites what was typed meanwhile.
  const setAnswers = (next: (current: Answers) => Answers) => {
    const latest = store.get(STORAGE_KEY)
    store.save(STORAGE_KEY, { ...latest, answers: next(latest.answers) })
  }
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }))

  const dictation = useDictation((text) =>
    setAnswers((current) => ({
      ...current,
      interests: (current.interests ? `${current.interests} ${text}` : text).slice(0, 500),
    })),
  )

  const showPreview = Boolean(plan && tourParam && plan.id === tourParam)

  // A `?tour=` this tab didn't plan (shared link, other device): the tour is
  // saved, so its own page shows it.
  useEffect(() => {
    if (restored && tourParam && !showPreview) {
      router.replace(`/${lng}/tour/${tourParam}` as Route)
    }
  }, [restored, tourParam, showPreview, lng, router])

  // The form unmounts into the preview: move focus to its heading so
  // keyboard and screen-reader users land on the result.
  useEffect(() => {
    if (showPreview) previewHeading.current?.focus()
  }, [showPreview])

  // In museum mode `answers.museumId` is the locked museum.
  const chosenName = museums.find((m) => m.value === answers.museumId)?.name ?? null
  const ages = answers.childrenAges.filter((age): age is number => age !== '')

  const setChildren = (count: number) =>
    setAnswers((current) => ({
      ...current,
      childrenAges: Array.from({ length: count }, (_, i) => current.childrenAges[i] ?? ''),
      // Somebody has to come: without children, at least one adult.
      adults: count === 0 ? Math.max(current.adults, 1) : current.adults,
    }))

  const setAge = (index: number, age: number | '') =>
    setAnswers((current) => ({
      ...current,
      childrenAges: current.childrenAges.map((old, i) => (i === index ? age : old)),
    }))

  const submit = async () => {
    if (answers.childrenAges.some((age) => age === '')) {
      setAgeError(true)
      setMoreOpen(true)
      return
    }
    setAgeError(false)
    setPlanning(true)
    setError(null)
    const body: PlanRequest = {
      museumId: answers.museumId,
      minutes: Number(answers.minutes),
      returning: answers.returning === 'returning',
      adults: answers.adults,
      childrenAges: ages,
      interests: answers.interests,
      lng,
    }
    try {
      const response = await fetch('/api/plan-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await response.json()) as PlannedTour & { error?: string }
      if (!response.ok) {
        // Each answer of the API gets its own problem and way out.
        const messages: Record<string, string> = {
          429: t('Too many visits planned in a short time. Try again in a minute.'),
          400: t('Some answers could not be read. Check them and try again.'),
          museum: t('Choose the museum, or name it in your interests.'),
          empty: t('This museum has no free contents to visit yet.'),
          budget: t('No content fits this time. Choose a longer visit and try again.'),
        }
        setError(
          messages[response.status] ??
            messages[json.error ?? ''] ??
            t('The visit could not be planned right now. Try again in a minute.'),
        )
        return
      }
      store.save(STORAGE_KEY, { ...store.get(STORAGE_KEY), plan: json })
      // A history entry of its own: Back from the preview is "Change".
      window.history.pushState(null, '', `${pathname}?tour=${json.id}`)
      pushedPreview.current = true
    } catch {
      setError(t('No connection. Check it and try again.'))
    } finally {
      setPlanning(false)
    }
  }

  const change = () => {
    if (pushedPreview.current) {
      pushedPreview.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', pathname)
    }
  }

  const reader = readerFor(answers.reader, ages)
  const readingQuery = new URLSearchParams()
  if (answers.wheelchair) readingQuery.set('mobility', 'wheelchair')
  setReadingProfile(readingQuery, reader)

  const start = () => {
    if (!plan) return
    const path = tourNavigationPath(lng, plan.museumId, plan.id, 0)
    router.push((readingQuery.size ? `${path}?${readingQuery}` : path) as Route)
  }

  return {
    answers,
    update,
    setChildren,
    setAge,
    ageError,
    moreOpen,
    setMoreOpen,
    planning,
    error,
    dictation,
    chosenName,
    ages,
    reader,
    readingQuery,
    plan,
    showPreview,
    previewHeading,
    change,
    start,
    submit,
  }
}
