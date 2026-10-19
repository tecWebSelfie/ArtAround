'use client'

import { parseMuseumConfig } from '@/lib/museum-config'
import {
  Alert,
  Button,
  FileButton,
  Modal,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { FileUp, Globe, Landmark, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Change museum": switches the whole app between global mode and one
 * museum (`src/lib/museum-mode.ts`). The modal searches museums by name;
 * while the search is empty it offers importing a config file instead, the
 * museum export developers download from the Payload admin panel.
 * Either way `/api/museum-mode` sets the cookie and the page re-renders
 * scoped to that museum.
 */

export type MuseumOption = { id: string; name: string; city?: string | null }

export function MuseumSwitch({
  current,
  museums,
}: {
  /** The locked museum, or `null` in global mode. */
  current: { id: string; name: string } | null
  museums: MuseumOption[]
}) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [opened, { open, close }] = useDisclosure(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lockTo = async (museum: { id: string | null; name: string | null } | null) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/museum-mode', {
        method: museum ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: museum ? JSON.stringify(museum) : undefined,
      })
      if (!response.ok) throw new Error(String(response.status))
      close()
      setQuery('')
      router.refresh()
    } catch {
      setError(t('This museum was not found here.'))
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File | null) => {
    if (!file) return
    const config = parseMuseumConfig(await file.text())
    if (!config) return setError(t('This file is not a museum export.'))
    await lockTo(config)
  }

  const words = query.trim().toLowerCase()
  const matches = words
    ? museums.filter((museum) =>
        `${museum.name} ${museum.city ?? ''}`.toLowerCase().includes(words),
      )
    : []

  return (
    <>
      <Button
        variant="light"
        radius="xl"
        size="compact-sm"
        leftSection={current ? <Landmark size={14} aria-hidden /> : <Globe size={14} aria-hidden />}
        onClick={open}
        aria-label={t('Change museum')}
        title={t('Change museum')}
        maw="100%"
      >
        <Text span inherit truncate>
          {current?.name ?? t('All museums')}
        </Text>
      </Button>
      <Modal opened={opened} onClose={close} title={t('Change museum')}>
        <Stack gap="sm">
          <TextInput
            data-autofocus
            leftSection={<Search size={16} aria-hidden />}
            placeholder={t('Search a museum')}
            aria-label={t('Search a museum')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          {words ? (
            matches.length ? (
              <Stack gap={2}>
                {matches.map((museum) => (
                  <UnstyledButton
                    key={museum.id}
                    px="sm"
                    py={8}
                    className="rounded-md hover:bg-gray-100"
                    disabled={busy}
                    onClick={() => void lockTo({ id: museum.id, name: museum.name })}
                  >
                    <Text size="sm" fw={600}>
                      {museum.name}
                    </Text>
                    {museum.city && (
                      <Text size="xs" c="dimmed">
                        {museum.city}
                      </Text>
                    )}
                  </UnstyledButton>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t('No museum matches “{{query}}”.', { query: query.trim() })}
              </Text>
            )
          ) : (
            // Empty search: the developer path, a museum exported from Payload.
            <Stack align="center" gap="xs" py="lg">
              <Text size="sm" c="dimmed">
                {t('or')}
              </Text>
              <FileButton
                onChange={(file) => void importFile(file)}
                accept=".json,.csv,application/json,text/csv"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="default"
                    leftSection={<FileUp size={16} aria-hidden />}
                    loading={busy}
                  >
                    {t('Import a config file')}
                  </Button>
                )}
              </FileButton>
              {current && (
                <Button
                  variant="subtle"
                  leftSection={<Globe size={16} aria-hidden />}
                  onClick={() => void lockTo(null)}
                  disabled={busy}
                >
                  {t('Back to all museums')}
                </Button>
              )}
            </Stack>
          )}
          {error && <Alert color="orange">{error}</Alert>}
        </Stack>
      </Modal>
    </>
  )
}
