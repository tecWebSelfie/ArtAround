/**
 * JSON text from a request (a form field, a query parameter) as a value, or
 * `null` when it isn't JSON at all: the caller's schema then rejects it (400)
 * instead of the route throwing (500).
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
