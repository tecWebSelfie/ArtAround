'use client'

import { parseMuseumConfig } from '@/lib/museum-config'
import {
  Alert,
  Button,
  Divider,
  FileButton,
  Group,
  Loader,
  Modal,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Check, FileUp, Globe, Landmark, RefreshCw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClearSearchButton } from './ClearSearchButton'

/**
 * "Change museum": switches the whole app between global mode and one
 * museum (`src/lib/museum-mode.ts`). Server pages and APIs read the cookie
 * that `/api/museum-mode` sets, so after the switch every search, list and
 * suggestion holds only that museum (or every museum again).
 *
 * The trigger is a museum mark with a switch arrow, read as "change museum"
 * rather than the old globe, which read as "language" or "world".
 *
 * The modal is one list, so the choice is always visible: "All museums"
 * first, then every museum (filtered as the visitor types), the current one
 * checked. Importing a museum export from the Payload admin panel (the
 * developer path) sits below a divider, out of the visitor's way.
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
  // Which row is switching ('all', a museum id, or 'file'), to show its loader.
  const [pending, setPending] = useState<string | null>(null)

  const lockTo = async (museum: { id: string | null; name: string | null } | null, row: string) => {
    setPending(row)
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
      setPending(null)
    }
  }

  const importFile = async (file: File | null) => {
    if (!file) return
    const config = parseMuseumConfig(await file.text())
    if (!config) return setError(t('This file is not a museum export.'))
    await lockTo(config, 'file')
  }

  const words = query.trim().toLowerCase()
  const matches = words
    ? museums.filter((museum) =>
        `${museum.name} ${museum.city ?? ''}`.toLowerCase().includes(words),
      )
    : museums
  const busy = pending !== null
  /** Trailing mark of a row: its loader while switching, a check when current. */
  const status = (row: string, active: boolean) =>
    pending === row ? <Loader size={16} /> : active ? <Check size={16} aria-hidden /> : null

  return (
    <>
      <Button
        variant="light"
        radius="xl"
        size="compact-sm"
        leftSection={<Landmark size={14} aria-hidden />}
        rightSection={<RefreshCw size={12} aria-hidden />}
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
            rightSection={query ? <ClearSearchButton onClear={() => setQuery('')} /> : null}
            rightSectionPointerEvents="all"
            placeholder={t('Search a museum')}
            aria-label={t('Search a museum')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          {/* Rows are NavLinks: one familiar selectable-list pattern, with the
              current choice `active` (light blue) and checked. */}
          <ScrollArea.Autosize mah={360} offsetScrollbars>
            <Stack gap={2}>
              {!words && (
                <NavLink
                  component="button"
                  label={t('All museums')}
                  leftSection={
                    <ThemeIcon variant="light" color="gray" radius="xl">
                      <Globe size={16} aria-hidden />
                    </ThemeIcon>
                  }
                  rightSection={status('all', !current)}
                  active={!current}
                  disabled={busy}
                  onClick={() => void (current ? lockTo(null, 'all') : close())}
                  className="rounded-md"
                />
              )}
              {matches.map((museum) => {
                const active = current?.id === museum.id
                return (
                  <NavLink
                    key={museum.id}
                    component="button"
                    label={museum.name}
                    description={museum.city}
                    leftSection={
                      <ThemeIcon variant="light" color="blue" radius="xl">
                        <Landmark size={16} aria-hidden />
                      </ThemeIcon>
                    }
                    rightSection={status(museum.id, active)}
                    active={active}
                    disabled={busy}
                    onClick={() =>
                      void (active
                        ? close()
                        : lockTo({ id: museum.id, name: museum.name }, museum.id))
                    }
                    className="rounded-md"
                  />
                )
              })}
              {words && matches.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  {t('No museum matches “{{query}}”.', { query: query.trim() })}
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
          {error && <Alert color="orange">{error}</Alert>}
          {/* The developer path: a museum exported from the Payload admin. */}
          <Divider label={t('or')} />
          <Group justify="center">
            <FileButton
              onChange={(file) => void importFile(file)}
              accept=".json,.csv,application/json,text/csv"
            >
              {(props) => (
                <Button
                  {...props}
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  leftSection={<FileUp size={14} aria-hidden />}
                  loading={pending === 'file'}
                  disabled={busy && pending !== 'file'}
                >
                  {t('Import a config file')}
                </Button>
              )}
            </FileButton>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
