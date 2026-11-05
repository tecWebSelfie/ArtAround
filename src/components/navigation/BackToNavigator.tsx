'use client'

import { Button } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * The way home on phones for focused pages outside the `(tabs)` group (Plan my
 * visit, sign in, sign up): below `md` they have neither the bottom
 * navigation nor the site header, so without this only the browser's Back
 * leads out. From `md` the site header's entries do the job, so it hides.
 * Place it first in the page column.
 */
export function BackToNavigator() {
  const { t } = useTranslation('common')
  const { lng } = useParams<{ lng: string }>()
  return (
    <Button
      component={Link}
      href={`/${lng}/navigator` as Route}
      hiddenFrom="md"
      variant="subtle"
      size="md"
      px="xs"
      className="self-start"
      leftSection={<ArrowLeft size={18} aria-hidden />}
    >
      {t('Back to the navigator')}
    </Button>
  )
}
