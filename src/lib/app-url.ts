/**
 * QR codes carry normal app URLs; accept only local paths or same-origin HTTP(S)
 * so scanning can use Next navigation without turning into an external redirect.
 */
export function parseAppUrl(
  rawValue: string | undefined,
  origin = window.location.origin,
): URL | null {
  const raw = rawValue?.trim()
  if (!raw || (!raw.startsWith('/') && !/^https?:\/\//i.test(raw))) return null

  try {
    const url = new URL(raw, origin)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin
      ? url
      : null
  } catch {
    return null
  }
}
