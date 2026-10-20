'use client'

import { payloadSdk } from '@/payload-sdk'
import { Select } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Searchable picker over the app's users, by first name, last name or
 * username (the sibling of `ObjectPicker`). Directors adding staff rarely
 * know someone's exact username; they know their name. The value is the
 * username, which the members form already resolves to a user.
 */
export function UserPicker({
  value,
  onChange,
  error,
  label,
}: {
  value: string | null
  onChange: (username: string | null) => void
  error?: string
  label: string
}) {
  const { t } = useTranslation('editing')
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search.trim(), 300)
  const results = useQuery({
    queryKey: ['user-picker', debounced],
    // Nothing until two letters: an empty query would list everyone.
    enabled: debounced.length >= 2,
    queryFn: () =>
      payloadSdk.find({
        collection: 'users',
        where: {
          or: [
            { username: { contains: debounced } },
            { 'name.firstName': { contains: debounced } },
            { 'name.lastName': { contains: debounced } },
          ],
        },
        select: { username: true, name: true },
        limit: 10,
        depth: 0,
      }),
  })
  const data = (results.data?.docs ?? []).flatMap((user) => {
    if (!user.username) return []
    const name = [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ')
    return [
      { value: user.username, label: name ? `${name} (@${user.username})` : `@${user.username}` },
    ]
  })

  return (
    <Select
      label={label}
      placeholder={t('Search by name or username')}
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
      nothingFoundMessage={debounced.length >= 2 ? t('No users found') : undefined}
      error={error}
    />
  )
}
