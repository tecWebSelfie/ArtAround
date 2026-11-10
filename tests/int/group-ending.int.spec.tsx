// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useState } from 'react'
import { GroupProvider, useGroup, useJoinGroup } from '@/components/group/GroupProvider'

// The LiveKit transport is a boundary; membership, end and HTTP handling remain real.
vi.mock('@/components/group/GroupConnection', () => ({ default: () => null }))
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  window.localStorage.clear()
  const interceptedFetch = globalThis.fetch
  // Node fetch needs an absolute URL; browser code legitimately uses its own origin.
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    interceptedFetch(
      typeof input === 'string' ? new URL(input, window.location.href) : input,
      init,
    ),
  )
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

function EndGroupProbe() {
  const join = useJoinGroup()
  const group = useGroup()
  const [failed, setFailed] = useState(false)
  return (
    <>
      <p>{group ? 'Host connected' : 'No group'}</p>
      <button
        onClick={() =>
          join({
            code: 'AB3X9K',
            tourId: 'tour',
            name: 'Guide',
            role: 'host',
            hostKey: 'fixture-host-key',
          })
        }
      >
        Join
      </button>
      {group && (
        <button
          onClick={() => {
            setFailed(false)
            void group.end().catch(() => setFailed(true))
          }}
        >
          End group
        </button>
      )}
      {failed && <p role="alert">Could not end</p>}
    </>
  )
}

describe('ending a group', () => {
  it('keeps membership after a failed DELETE, then leaves only after a successful retry', async () => {
    let status = 503
    server.use(
      http.delete('*/api/rooms/AB3X9K', ({ request }) => {
        if (request.headers.get('X-Host-Key') !== 'fixture-host-key')
          return new HttpResponse(null, { status: 403 })
        return new HttpResponse(null, { status })
      }),
    )
    render(
      <GroupProvider>
        <EndGroupProbe />
      </GroupProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))
    await screen.findByText('Host connected')
    fireEvent.click(screen.getByRole('button', { name: 'End group' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Host connected')).toBeTruthy()
    status = 204
    fireEvent.click(screen.getByRole('button', { name: 'End group' }))
    await waitFor(() => expect(screen.getByText('No group')).toBeTruthy())
  })
})
