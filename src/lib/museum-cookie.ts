/**
 * Museum mode (see `museum-mode.ts`) outside the server: the cookie, in a
 * module with no server imports so the proxy (`src/proxy.ts`) can set it too
 * (a printed QR code carries `?museum=<id>` and opens the app already in that
 * museum), and the browser call that switches it (`setMuseumMode`).
 */
export const MUSEUM_MODE_COOKIE = 'aa-museum'

/** A Mongo ObjectId: the shape of every document id, museums included. */
export const OBJECT_ID = /^[a-f0-9]{24}$/

export const MUSEUM_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
} as const

/**
 * Browser side of the switch (`/api/museum-mode`), shared by the museum switch
 * and the "Use the museum's app" offer: locks the app to `museum` (looked up by
 * id, else by exact name) or, with `null`, returns it to every museum. The
 * caller refreshes the route on success. Resolves to whether it worked.
 */
export async function setMuseumMode(museum: { id: string | null; name: string | null } | null) {
  const response = await fetch('/api/museum-mode', {
    method: museum ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: museum ? JSON.stringify(museum) : undefined,
  }).catch(() => null)
  return Boolean(response?.ok)
}
