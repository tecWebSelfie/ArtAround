import 'server-only'

/**
 * Tiny in-memory limiter for the AI routes (`/api/assistant`, `/api/speech`),
 * which call paid speech and language APIs: at most `limit` requests per
 * client IP per minute. Per server instance only; enough for one deployment.
 */
const WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

export function allowRequest(request: Request, limit: number) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= limit) return false
  recent.push(now)
  hits.set(ip, recent)
  return true
}
