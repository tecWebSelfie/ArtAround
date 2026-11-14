'use client'

import { SegmentedControl } from '@mantine/core'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The profile's museum filter, shown only in museum mode: "This museum"
 * (the default, as every other list in museum mode) or "All". Before it the
 * profile filtered silently, so a tour made elsewhere seemed to come and go;
 * now the filter is visible and one tap lifts it.
 *
 * The choice lives in the URL (`?scope=all`), read by the server page, so a
 * shared profile link keeps its filter.
 */
export function ProfileMuseumFilter({
  museumName,
  museumOnly,
}: {
  museumName: string
  museumOnly: boolean
}) {
  const { t } = useTranslation('user-page')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') params.set('scope', 'all')
    else params.delete('scope')
    const query = params.toString()
    // Replace: switching the filter is not a new page to go back through.
    startTransition(() =>
      router.replace(`${pathname}${query ? `?${query}` : ''}` as Route, { scroll: false }),
    )
  }

  return (
    <SegmentedControl
      size="xs"
      radius="xl"
      className="self-start"
      value={museumOnly ? 'museum' : 'all'}
      disabled={pending}
      aria-label={t('Show work from')}
      onChange={onChange}
      data={[
        { value: 'museum', label: museumName },
        { value: 'all', label: t('All museums') },
      ]}
    />
  )
}
