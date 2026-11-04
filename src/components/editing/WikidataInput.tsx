'use client'

import { Anchor, Autocomplete, type AutocompleteProps } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { searchWikidataAction } from './forms/wikidata-actions'

/**
 * Picks a work's universal identifier (`objects.wikidataId`): the editor
 * types the work's name and chooses among Wikidata's items, labelled in the
 * page's language with their description, or types a Q-id directly. The
 * value is the bare Q-id; once saved, the server links the work's author,
 * movement and events (`importWikidataSubjects`).
 */
export function WikidataInput({
  value,
  onChange,
  ...props
}: { value: string; onChange: (value: string) => void } & Omit<
  AutocompleteProps,
  'value' | 'onChange' | 'data'
>) {
  const { t } = useTranslation('editing')
  const lng = useParams<{ lng?: string }>()?.lng ?? 'en'
  const [query] = useDebouncedValue(value.trim(), 400)
  // A Q-id is already an answer: only names are searched.
  const searchable = query.length >= 2 && !/^Q\d+$/.test(query)
  const results = useQuery({
    queryKey: ['wikidata-search', lng, query],
    queryFn: () => searchWikidataAction(query, lng),
    enabled: searchable,
    staleTime: 10 * 60_000,
  })
  return (
    <Autocomplete
      label={t('Wikidata')}
      description={
        /^Q\d+$/.test(value.trim()) ? (
          <Anchor href={`https://www.wikidata.org/wiki/${value.trim()}`} target="_blank" inherit>
            {t('Open {{id}} on Wikidata', { id: value.trim() })}
          </Anchor>
        ) : (
          t('Search the work by name, or type its Q-id')
        )
      }
      value={value}
      onChange={onChange}
      data={(searchable ? (results.data ?? []) : []).map((item) => ({
        value: item.id,
        label: [item.label, item.description, item.id].filter(Boolean).join(' · '),
      }))}
      // Wikidata already ranked the results: show them as they come.
      filter={({ options }) => options}
      {...props}
    />
  )
}
