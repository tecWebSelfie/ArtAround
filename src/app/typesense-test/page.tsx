'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Search } from 'lucide-react'

type HealthState = {
  status?: string
  typesense?: { ok?: boolean; version?: string }
  collections?: unknown
  error?: string
  responseTime?: number
  raw?: unknown
}

type Hit = {
  id?: string
  collection?: string
  document?: Record<string, unknown>
  text_match?: number
  [key: string]: unknown
}

const COLLECTION_OPTIONS = [
  { value: 'all', label: 'All collections (universal)' },
  { value: 'museums', label: 'museums' },
  { value: 'users', label: 'users' },
]

type ProbeCollection = {
  collection: string
  displayName?: string
  error?: string
  found?: number
}

type ProbeResponse = {
  collections?: ProbeCollection[]
  details?: string
  error?: string
  found?: number
  hits?: unknown[]
}

type ProbeResult = {
  collectionsJson: unknown
  probeJson: ProbeResponse
  probeOk: boolean
  probeStatus: number
}

// NOTE: /api/search/health is unusable with this plugin version — the
// /search/:collectionName route is registered before it, so a request to
// /search/health is handled as a search for collection "health" with an empty
// q ("Invalid search parameters"). We probe with a real search instead: a
// query that matches nothing still proves the full round-trip to Typesense.
const PROBE_QUERY = 'typesense-connection-probe-zzz'

async function fetchProbePayload(): Promise<ProbeResult> {
  const [probeRes, collectionsRes] = await Promise.all([
    fetch(`/api/search?q=${PROBE_QUERY}&per_page=1`),
    fetch('/api/search/collections'),
  ])
  const probeJson = (await probeRes.json()) as ProbeResponse
  const collectionsJson = collectionsRes.ok ? ((await collectionsRes.json()) as unknown) : null
  return { collectionsJson, probeJson, probeOk: probeRes.ok, probeStatus: probeRes.status }
}

function interpretProbe({ probeJson, probeOk, probeStatus }: ProbeResult): {
  error: string | null
  ok: boolean
} {
  if (!probeOk || probeJson.error) {
    const detail = probeJson.details ? ` — ${probeJson.details}` : ''
    return {
      error: `${probeJson.error || 'Search probe failed'}${detail} (HTTP ${probeStatus})`,
      ok: false,
    }
  }
  const cols = probeJson.collections ?? []
  const failed = cols.filter((c) => c.error)
  if (cols.length > 0 && failed.length === cols.length) {
    // Typesense itself unreachable: every collection carries its own error.
    return { error: failed.map((c) => `${c.collection}: ${c.error}`).join(' | '), ok: false }
  }
  // Reachable — even with 0 hits (an empty index is still a working connection).
  return { error: null, ok: true }
}

export default function TypesenseTestPage() {
  const [health, setHealth] = useState<HealthState | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [collectionsMeta, setCollectionsMeta] = useState<unknown>(null)

  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState<string>('all')
  const [hits, setHits] = useState<Hit[]>([])
  const [found, setFound] = useState<number | null>(null)
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const result = await fetchProbePayload()
      const { error, ok } = interpretProbe(result)
      setHealth({
        collections: result.probeJson.collections,
        raw: result.probeJson,
        status: ok ? 'healthy' : 'unhealthy',
        typesense: { ok },
      })
      if (error) {
        setHealthError(error)
      }
      if (result.collectionsJson) {
        setCollectionsMeta(result.collectionsJson)
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // Initial check on mount. State is only updated after the fetch resolves
  // (never synchronously in the effect body) to avoid cascading renders.
  useEffect(() => {
    let cancelled = false
    async function loadOnMount() {
      try {
        const result = await fetchProbePayload()
        if (cancelled) return
        const { error, ok } = interpretProbe(result)
        setHealth({
          collections: result.probeJson.collections,
          raw: result.probeJson,
          status: ok ? 'healthy' : 'unhealthy',
          typesense: { ok },
        })
        if (error) {
          setHealthError(error)
        }
        if (result.collectionsJson) {
          setCollectionsMeta(result.collectionsJson)
        }
      } catch (err) {
        if (!cancelled) {
          setHealthError(err instanceof Error ? err.message : 'Connection failed')
        }
      } finally {
        if (!cancelled) {
          setHealthLoading(false)
        }
      }
    }
    void loadOnMount()
    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setSearchError('Type something first.')
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    try {
      const path =
        collection === 'all'
          ? `/api/search?q=${encodeURIComponent(q)}&per_page=10`
          : `/api/search/${collection}?q=${encodeURIComponent(q)}&per_page=10`
      const res = await fetch(path)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || `Search failed (HTTP ${res.status})`)
      }
      setHits(Array.isArray(json?.hits) ? json.hits : [])
      setFound(typeof json?.found === 'number' ? json.found : null)
      setSearchTime(typeof json?.search_time_ms === 'number' ? json.search_time_ms : null)
      if (!json?.hits?.length) {
        setSearchError(
          'Connected, but no hits. The collection may be empty or not synced yet — create/edit a doc in Payload, then retry.',
        )
      }
    } catch (err) {
      setHits([])
      setFound(null)
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchLoading(false)
    }
  }, [query, collection])

  const isHealthy = health?.status === 'healthy' && health?.typesense?.ok

  return (
    <Stack maw={860} mx="auto" px="md" py="xl" gap="lg">
      <Title order={1}>Typesense test</Title>
      <Text c="dimmed">
        Tests the live connection to Typesense Cloud through the plugin proxy endpoints
        (`/api/search/*`). Your browser never talks to Typesense directly.
      </Text>

      <Card withBorder shadow="sm" p="lg">
        <Group justify="space-between" align="center">
          <Title order={3}>1. Connection</Title>
          {healthLoading ? (
            <Loader size="sm" />
          ) : (
            <Badge color={isHealthy ? 'green' : 'red'} variant="filled">
              {isHealthy ? 'healthy' : 'unhealthy / unknown'}
            </Badge>
          )}
        </Group>

        <Group mt="md">
          <Button onClick={() => void checkConnection()} loading={healthLoading} variant="outline">
            Re-check connection
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          Probed with a real search (`/api/search?q=…`). 0 hits still means healthy — an
          empty index is a working connection. Per-collection errors mean Typesense itself
          is unreachable.
        </Text>

        {healthError && (
          <Alert color="red" title="Connection problem" mt="md">
            {healthError}
            <Text size="sm" mt="xs">
              Checklist: server restarted after the config fix? `TYPESENSE_HOST` has no `https://`
              prefix? `TYPESENSE_PORT=443` + `TYPESENSE_PROTOCOL=https`? At least one collection
              enabled in `payload.config.ts`?
            </Text>
          </Alert>
        )}

        {health && (
          <Code block mt="md" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(health.raw, null, 2)}
          </Code>
        )}

        {collectionsMeta ? (
          <>
            <Title order={4} mt="md">
              Enabled collections (`/api/search/collections`)
            </Title>
            <Code block mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(collectionsMeta, null, 2)}
            </Code>
          </>
        ) : null}
      </Card>

      <Card withBorder shadow="sm" p="lg">
        <Title order={3}>2. Search</Title>
        <Group mt="md" align="flex-end">
          <TextInput
            label="Query"
            placeholder="e.g. museum name, user name..."
            leftSection={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch()
            }}
            style={{ flex: 1 }}
          />
          <Select
            label="Collection"
            data={COLLECTION_OPTIONS}
            value={collection}
            onChange={(v) => setCollection(v || 'all')}
            w={220}
          />
          <Button onClick={() => void runSearch()} loading={searchLoading}>
            Search
          </Button>
        </Group>

        {searchError && (
          <Alert color={hits.length ? 'yellow' : 'red'} title="Search note" mt="md">
            {searchError}
          </Alert>
        )}

        {(found !== null || searchTime !== null) && (
          <Text size="sm" c="dimmed" mt="md">
            {found !== null && `${found} found`}
            {found !== null && searchTime !== null && ' · '}
            {searchTime !== null && `${searchTime} ms`}
          </Text>
        )}

        <Stack gap="xs" mt="sm">
          {hits.map((hit, i) => (
            <Card key={String(hit.id ?? i)} withBorder p="sm">
              <Group justify="space-between">
                <Text fw={600}>
                  {String(
                    (hit.document as Record<string, unknown> | undefined)?.name ??
                      (hit.document as Record<string, unknown> | undefined)?.title ??
                      hit.id ??
                      `hit ${i + 1}`,
                  )}
                </Text>
                {hit.collection && <Badge variant="light">{String(hit.collection)}</Badge>}
              </Group>
              <Code block mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(hit.document ?? hit, null, 2)}
              </Code>
            </Card>
          ))}
        </Stack>
      </Card>
    </Stack>
  )
}
