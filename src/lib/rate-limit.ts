import 'server-only'

/**
 * Tiny in-memory limiter for the AI routes (`/api/assistant`, `/api/speech`,
 * `/api/expand`, `/api/plan-tour`, `/api/transcribe`), which call paid speech and
 * language APIs, and the group room routes (`/api/rooms`, `/api/rooms/token`):
 * at most `limit` requests per client IP and route per minute. Per server
 * instance only; enough for one deployment.
 */
const WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

export function allowRequest(request: Request, limit: number, bucket?: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  // Counted per route, so many expansions don't use up the tour planner's budget.
  // A route whose path carries a secret guess (`/api/rooms/{code}`) passes a fixed
  // `bucket`, or each guessed code would get its own budget and nothing would be limited.
  const key = `${ip} ${bucket ?? new URL(request.url).pathname}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= limit) return false
  recent.push(now)
  hits.set(key, recent)
  return true
}
