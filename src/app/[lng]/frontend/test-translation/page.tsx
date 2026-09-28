'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, Badge, Button, Code, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core'

type Status = 'idle' | 'loading' | 'hit' | 'stale-refreshing' | 'miss-queued' | 'miss-queue-failed' | 'miss-throttled' | 'error'

type ApiResponse = {
  status: string
  source?: string
  locale?: string
  doc?: Record<string, unknown>
  queued?: number | null
  queueError?: string
  error?: string
  hint?: string
}

const COLLECTIONS = ['museums', 'objects', 'contents']
const LOCALES = ['it', 'fr', 'de', 'es', 'pt', 'nl', 'ja', 'zh', 'ar', 'en']

function renderPreview(doc: Record<string, unknown> | undefined): string {
  if (!doc) return '—'
  const first =
    (doc.shortDescription as string) ?? (doc.description as string) ?? (doc.title as string) ?? (doc.name as string)
  if (typeof first === 'string') return first.slice(0, 300)
  if (first && typeof first === 'object') return JSON.stringify(first).slice(0, 300) + '… (lexical JSON)'
  return JSON.stringify(doc).slice(0, 300)
}

function TestTranslationInner() {
  const searchParams = useSearchParams()
  const [collection, setCollection] = useState(searchParams.get('collection') || 'objects')
  const [id, setId] = useState(searchParams.get('id') || '')
  const [locale, setLocale] = useState(
    searchParams.get('locale') || (typeof navigator !== 'undefined' ? navigator.language.split(/[-_]/)[0].toLowerCase() : 'fr'),
  )
  const [status, setStatus] = useState<Status>('idle')
  const [detail, setDetail] = useState<ApiResponse | null>(null)
  const [polls, setPolls] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(0)

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  useEffect(() => stop, [stop])

  const fetchOnce = useCallback(async () => {
    const res = await fetch(`/api/${collection}/${id}/localized?locale=${locale}`)
    const body = (await res.json()) as ApiResponse
    return { res, body }
  }, [collection, id, locale])

  const start = useCallback(async () => {
    if (!id) return
    stop()
    setLog([])
    setPolls(0)
    setElapsedMs(0)
    setStatus('loading')
    startedAt.current = Date.now()
    const push = (line: string) => setLog((l) => [...l, `${new Date().toISOString().slice(11, 19)} ${line}`])

    push(`GET /api/${collection}/${id}/localized?locale=${locale} (receipt + freshness check)`)
    try {
      const { res, body } = await fetchOnce()
      setDetail(body)
      if (body.status === 'hit') {
        setStatus('hit')
        setElapsedMs(Date.now() - startedAt.current)
        push(`HIT from DB — fresh receipt, no AI cost.`)
        return
      }
      if (!res.ok && body.error) {
        setStatus('error')
        push(`ERROR: ${body.error}`)
        return
      }
      setStatus((body.status as Status) || 'miss-queued')
      push(`${body.status === 'stale-refreshing' ? 'STALE → serving stored translation + refresh queued' : 'MISS → fallback EN painted + enqueue'} (queued=${body.queued ?? '?'}) ${body.queueError ? `(queueError: ${body.queueError})` : ''}`)

      // Poll the SAME url until it flips to HIT (translation persisted).
      let n = 0
      timer.current = setInterval(async () => {
        n += 1
        setPolls(n)
        const { body: p } = await fetchOnce()
        setDetail(p)
        setElapsedMs(Date.now() - startedAt.current)
        push(`poll #${n}: status=${p.status}`)
        if (p.status === 'hit' || n >= 15) {
          stop()
          if (p.status === 'hit') {
            setStatus('hit')
            push(`HIT — next visitors get it instantly, zero AI.`)
          } else {
            push(`Still missing after 15 polls — Jobs queue may need a runner tick (POST /api/translate/run/:id on serverless).`)
          }
        }
      }, 2000)
    } catch (err) {
      setStatus('error')
      push(`fetch failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [collection, id, locale, fetchOnce, stop])

  const badgeColor =
    status === 'hit'
      ? 'green'
      : status === 'stale-refreshing'
        ? 'blue'
        : status === 'loading'
          ? 'gray'
          : status.startsWith('miss')
            ? 'yellow'
            : status === 'error'
              ? 'red'
              : 'gray'

  return (
    <Stack gap="md" p="xl" maw={760} mx="auto">
      <Title order={2}>Test translation on-demand (demo)</Title>
      <Text size="sm" c="dimmed">
        The endpoint checks the translator receipt book (<Code>translator-provenance</Code>): no receipt = MISS
        (paints EN, queues one background job), receipt + fresh = HIT, receipt + stale source = serves stored
        translation while refreshing. Polls this same URL until HIT. Next visitors pay zero AI.
      </Text>

      <Group grow>
        <Select label="Collection" data={COLLECTIONS} value={collection} onChange={(v) => v && setCollection(v)} />
        <Select label="Locale" data={LOCALES} value={locale} onChange={(v) => v && setLocale(v)} searchable />
      </Group>
      <TextInput label="Document ID" placeholder="paste a museums/objects/contents id" value={id} onChange={(e) => setId(e.currentTarget.value)} />
      <Group>
        <Button onClick={start} disabled={!id || status === 'loading'}>Translate on demand</Button>
        <Button variant="outline" onClick={stop}>Stop polling</Button>
        <Badge color={badgeColor}>{status}{polls > 0 ? ` · ${polls} polls · ${(elapsedMs / 1000).toFixed(1)}s` : ''}</Badge>
      </Group>

      {detail?.queueError && <Alert color="red" title="Queue error">{detail.queueError} — is GROQ_API_KEY set? See server logs. Job stays queued; retry fires automatically.</Alert>}

      {detail?.doc && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>Preview ({detail.source}):</Text>
          <Code block>{renderPreview(detail.doc)}</Code>
        </Stack>
      )}

      {log.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>Live log (this is the pattern for your real frontend):</Text>
          <Code block>{log.join('\n')}</Code>
        </Stack>
      )}
    </Stack>
  )
}

export default function TestTranslationPage() {
  return (
    <Suspense fallback={<Text p="xl">loading…</Text>}>
      <TestTranslationInner />
    </Suspense>
  )
}
