'use client'

import { payloadSdk } from '@/payload-sdk'
import { Select } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Searchable picker over the whole object catalog (objects are public and
 * independent of museums), searched server-side by name.
 */
export function ObjectPicker({
  value,
  initial,
  onChange,
  error,
}: {
  value: string | null
  /** Label for a preselected object (e.g. from `?object=`), shown before any search. */
  initial?: { id: string; name: string } | null
  onChange: (id: string | null) => void
  error?: string
}) {
  const { t } = useTranslation('editing')
  const [search, setSearch] = useState(initial?.name ?? '')
  const [debounced] = useDebouncedValue(search, 300)
  const results = useQuery({
    queryKey: ['object-picker', debounced],
    queryFn: () =>
      payloadSdk.find({
        collection: 'objects',
        // `contains` (case-insensitive substring) suits search-as-you-type;
        // `like` would require every whole word.
        where: debounced ? { name: { contains: debounced } } : undefined,
        select: { name: true },
        limit: 20,
        depth: 0,
      }),
  })
  const data = (results.data?.docs ?? []).map((object) => ({
    value: object.id,
    label: object.name,
  }))
  if (initial && !data.some((option) => option.value === initial.id)) {
    data.unshift({ value: initial.id, label: initial.name })
  }

  return (
    <Select
      label={t('Object')}
      description={t('The museum object this content is about.')}
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
      nothingFoundMessage={t('No objects found')}
      error={error}
    />
  )
}
