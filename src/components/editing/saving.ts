'use client'

import { notifications } from '@mantine/notifications'
import { PayloadSDKError } from '@payloadcms/sdk'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * Client-side write helpers shared by every editing form.
 *
 * Forms write through `payloadSdk` (REST with the visitor's cookie), so the
 * collection access rules in `src/access/` decide every save; the UI only
 * hides what the server would refuse anyway. After a save, the current route
 * is refreshed so server components re-read the document as the visitor.
 */

/**
 * Editorial fields are AI-translated from the source locale, so frontend
 * edits always read and write `en` (the original text), never a translation.
 * See docs/permissions-and-editing.md → "Editing localized fields".
 */
export const SOURCE_LOCALE = 'en' as const

/** Best human-readable message from a Payload SDK / fetch failure. */
export function errorMessage(error: unknown): string {
  if (error instanceof PayloadSDKError) {
    const first = error.errors?.[0]
    // Validation errors carry per-field messages one level deeper.
    const field = (first?.data as { errors?: { message?: string }[] } | undefined)?.errors?.[0]
    return field?.message ?? first?.message ?? error.message
  }
  return error instanceof Error ? error.message : String(error ?? '')
}

/**
 * Mutation that shows a notification on failure, refreshes server data on
 * success and then runs `onSaved` (e.g. leave edit mode or navigate).
 */
export function useSave<TInput, TResult>(
  save: (input: TInput) => Promise<TResult>,
  onSaved?: (result: TResult) => void,
) {
  const router = useRouter()
  const { t } = useTranslation('editing')
  return useMutation({
    mutationFn: save,
    onSuccess: (result) => {
      notifications.show({ color: 'green', message: t('Saved') })
      router.refresh()
      onSaved?.(result)
    },
    onError: (error) => {
      notifications.show({ color: 'red', title: t('Could not save'), message: errorMessage(error) })
    },
  })
}
