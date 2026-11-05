'use client'

import { payloadSdk } from '@/payload-sdk'
import { Select } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import type { Where } from 'payload'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type PickerProps = {
  value: string | null
  /** Label for a preselected document (e.g. from `?object=`), shown before any search. */
  initial?: { id: string; name: string } | null
  onChange: (id: string | null) => void
  error?: string
}

/**
 * Searchable select over a public collection with a `name`, searched
 * server-side as the author types: the shared body of `ObjectPicker` and
 * `SubjectPicker`.
 */
function NamePicker({
  collection,
  where = [],
  label,
  description,
  nothingFound,
  value,
  initial,
  onChange,
  error,
}: PickerProps & {
  collection: 'objects' | 'subjects'
  /** Extra constraints, also part of the query key. */
  where?: Where[]
  label: string
  description: string
  nothingFound: string
}) {
  const [search, setSearch] = useState(initial?.name ?? '')
  const [debounced] = useDebouncedValue(search, 300)
  const results = useQuery({
    queryKey: ['name-picker', collection, debounced, where],
    queryFn: () =>
      payloadSdk.find({
        collection,
        // `contains` (case-insensitive substring) suits search-as-you-type;
        // `like` would require every whole word.
        where: { and: [...(debounced ? [{ name: { contains: debounced } }] : []), ...where] },
        select: { name: true },
        limit: 20,
        depth: 0,
      }),
  })
  const data = (results.data?.docs ?? []).map((doc) => ({ value: doc.id, label: doc.name }))
  if (initial && !data.some((option) => option.value === initial.id)) {
    data.unshift({ value: initial.id, label: initial.name })
  }

  return (
    <Select
      label={label}
      description={description}
      required
      searchable
      clearable
      searchValue={search}
      onSearchChange={setSearch}
      // Results are already filtered by the server query.
      filter={({ options }) => options}
      data={data}
      value={value}
      onChange={onChange}
      loading={results.isFetching}
      nothingFoundMessage={nothingFound}
      error={error}
    />
  )
}

/**
 * Picker over the whole object catalog (objects are public and independent of
 * museums). `museum` narrows it to the objects that museum exhibits: a content
 * written as a tour stop must be about one of them, or the tour editor
 * couldn't offer it.
 */
export function ObjectPicker({
  museum,
  ...props
}: PickerProps & {
  /** Only this museum's exhibited objects (name + ids, from the server). */
  museum?: { name: string; objectIds: string[] } | null
}) {
  const { t } = useTranslation('editing')
  return (
    <NamePicker
      {...props}
      collection="objects"
      where={museum ? [{ id: { in: museum.objectIds } }] : []}
      label={t('Object')}
      description={
        museum
          ? t('An object on show at {{museum}} — the stop goes there on the map', {
              museum: museum.name,
            })
          : t('The museum object this content is about.')
      }
      nothingFound={t('No objects found')}
    />
  )
}

/**
 * Picker over the subjects (artists, movements and styles, events; mostly
 * imported from Wikidata): what a content about a related topic is written
 * about instead of a work (course specification: items may refer to
 * cultural movements, styles, artists, historical events).
 */
export function SubjectPicker(props: PickerProps) {
  const { t } = useTranslation('editing')
  return (
    <NamePicker
      {...props}
      collection="subjects"
      label={t('Subject')}
      description={t('The artist, movement, style or event this content is about.')}
      nothingFound={t('No subjects found')}
    />
  )
}
