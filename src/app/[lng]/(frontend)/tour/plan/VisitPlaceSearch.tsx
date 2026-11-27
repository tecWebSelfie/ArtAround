'use client'

import { distanceKm, type MuseumPoint } from '@/lib/museum-location'
import { useCurrentLocation, usePhotonAutocomplete } from '@asammad48/react-map-place'
import { Crosshair, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Museum } from './plan-visit-state'

/**
 * The "Where are you?" step: the visitor types where they are (Photon
 * geocodes the text — the hook debounces, caches and times out the
 * requests) or shares their location, and the app's museums come back as
 * radio cards ordered by distance from that point. A chosen museum stays
 * visible as a remembered row until the visitor changes it, so the answer
 * survives reloads without any place being typed.
 */
export function VisitPlaceSearch({
  museums,
  value,
  onChange,
  labelledBy,
}: {
  museums: Museum[]
  /** The selected museum's id, or null until the visitor picks one. */
  value: string | null
  onChange: (museumId: string | null) => void
  /** The step title's id, labelling this control group. */
  labelledBy: string
}) {
  const { t, i18n } = useTranslation('plan-visit')
  const language = i18n.resolvedLanguage?.split('-')[0] ?? 'en'
  const [text, setText] = useState('')
  // Where the reference point came from: only a typed place may be replaced
  // by a later Photon result; a shared location stays until the text changes.
  const [pointSource, setPointSource] = useState<'text' | 'location'>('text')
  const [sharedPoint, setSharedPoint] = useState<MuseumPoint | null>(null)
  const search = usePhotonAutocomplete({
    endpoint: process.env.NEXT_PUBLIC_PHOTON_ENDPOINT || 'https://photon.komoot.io',
    // The public Photon instance's default index supports these label languages.
    language: ['en', 'de', 'fr'].includes(language) ? language : 'en',
    minimumQueryLength: 3,
    debounceMs: 300,
    requestTimeoutMs: 8000,
  })
  const location = useCurrentLocation()

  // The first Photon match for the current text is the reference point: the
  // visitor does not pick a place, they just type and the museums reorder.
  // It is derived from external search state, not copied into React state.
  const match = search.results[0]
  const typedPoint: MuseumPoint | null =
    text.trim().length >= 3 && match ? [match.longitude, match.latitude] : null
  const point = pointSource === 'location' ? sharedPoint : typedPoint

  // Typing starts a new typed place; shared location never remains the source
  // once the text changes. Clearing the text clears the reference point.
  const onType = (next: string) => {
    setText(next)
    search.setQuery(next)
    setPointSource('text')
  }

  const shareLocation = async () => {
    const fix = await location.requestLocation()
    if (!fix) return
    setSharedPoint([fix.longitude, fix.latitude])
    setPointSource('location')
    setText(t('Your location'))
    // Re-ranking for the shared location starts from no chosen museum.
    onChange(null)
  }

  // Museums with coordinates, nearest first, a handful is enough to choose.
  const suggestions = useMemo(() => {
    const reference = point
    if (!reference) return []
    return museums
      .filter((museum): museum is MuseumWithLocation => museum.latlng !== null)
      .map((museum) => ({
        museum,
        km: distanceKm({ longitude: reference[0], latitude: reference[1] }, museum.latlng),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 5)
  }, [museums, point])

  const selected = museums.find((museum) => museum.value === value) ?? null
  const searching = search.loading && text.trim().length >= 3 && pointSource === 'text'

  return (
    <div className="plan-visit-place" data-searching={searching || undefined}>
      <div className="plan-visit-search">
        <input
          type="text"
          aria-labelledby={labelledBy}
          placeholder={t('Example place')}
          value={text}
          onChange={(event) => onType(event.currentTarget.value)}
        />
        <button
          type="button"
          className="plan-visit-locate"
          aria-label={t('Use my location')}
          onClick={() => void shareLocation()}
        >
          <Crosshair size={14} aria-hidden />
        </button>
      </div>
      <PlaceSearchResults
        searching={searching}
        hasError={Boolean(search.error && text.trim().length >= 3)}
        selected={selected}
        suggestions={suggestions}
        point={point}
        value={value}
        language={language}
        labelledBy={labelledBy}
        onChange={onChange}
      />
    </div>
  )
}

type MuseumWithLocation = Museum & { latlng: MuseumPoint }
type Suggestion = { museum: MuseumWithLocation; km: number }

/** One status, one remembered choice, or one ordered native radio group. */
function PlaceSearchResults({
  searching,
  hasError,
  selected,
  suggestions,
  point,
  value,
  language,
  labelledBy,
  onChange,
}: {
  searching: boolean
  hasError: boolean
  selected: Museum | null
  suggestions: Suggestion[]
  point: MuseumPoint | null
  value: string | null
  language: string
  labelledBy: string
  onChange: (museumId: string | null) => void
}) {
  const { t } = useTranslation('plan-visit')
  if (searching) {
    return (
      <p className="plan-visit-place-status" role="status">
        {t('Searching for the place…')}
      </p>
    )
  }
  if (hasError) {
    return (
      <p className="plan-visit-place-status" role="status">
        {t('Place search is unavailable. Check the text or try again.')}
      </p>
    )
  }
  // The chosen museum, remembered: it stays until the visitor changes it.
  if (selected) {
    return (
      <div className="plan-visit-selected">
        <MapPin size={18} aria-hidden />
        <b>{selected.name}</b>
        <button type="button" className="plan-visit-selected-change" onClick={() => onChange(null)}>
          {t('Change')}
        </button>
      </div>
    )
  }
  if (suggestions.length === 0) {
    return point ? (
      <p className="plan-visit-place-status" role="status">
        {t('No museums around that place yet.')}
      </p>
    ) : (
      <p className="plan-visit-place-status">
        {t('Type the place you are at - the nearest museums come first.')}
      </p>
    )
  }
  return (
    // Radio cards: one tab stop per option, arrows move the selection,
    // and the row scrolls itself to the focused card.
    <div className="plan-visit-sugg" role="radiogroup" aria-labelledby={labelledBy}>
      {suggestions.map(({ museum, km }, index) => (
        <SuggestionCard
          key={museum.value}
          museum={museum}
          distance={formatDistance(language, km)}
          nearest={index === 0 && suggestions.length > 1}
          checked={value === museum.value}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

/** Native scroll-snap radio card; no carousel keyboard capture or extra tab stop. */
function SuggestionCard({
  museum,
  distance,
  nearest,
  checked,
  onChange,
}: {
  museum: MuseumWithLocation
  distance: string
  nearest: boolean
  checked: boolean
  onChange: (museumId: string | null) => void
}) {
  const { t } = useTranslation('plan-visit')
  return (
    <label className="plan-visit-sugg-card">
      <input
        type="radio"
        name="plan-museum"
        value={museum.value}
        checked={checked}
        onChange={() => onChange(museum.value)}
      />
      <span className="plan-visit-sugg-thumb" aria-hidden>
        {museum.name.charAt(0)}
      </span>
      <span className="plan-visit-sugg-copy">
        <b>
          {museum.name}
          {nearest && <span className="plan-visit-sugg-near">{t('Nearest')}</span>}
        </b>
        <small>{cityOf(museum)}</small>
      </span>
      <span className="plan-visit-sugg-distance">{distance}</span>
    </label>
  )
}

function formatDistance(language: string, km: number) {
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: km < 1 ? 'meter' : 'kilometer',
    maximumFractionDigits: km < 1 ? 0 : 1,
  }).format(km < 1 ? Math.round(km * 1000) : km)
}

/** The city in "Name, City", when the label carries one. */
function cityOf(museum: Museum) {
  return museum.label.startsWith(`${museum.name}, `)
    ? museum.label.slice(museum.name.length + 2)
    : museum.label
}
