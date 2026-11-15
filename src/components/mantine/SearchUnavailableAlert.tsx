import { Alert } from '@mantine/core'
import { TriangleAlert } from 'lucide-react'

/**
 * Shown in place of results when Typesense is unreachable or unconfigured.
 *
 * Search has no Payload fallback on purpose: a second, differently-ranked
 * result set would hide the outage. The bar stays on screen, so the visitor can
 * retry once the cluster is back.
 */
export function SearchUnavailableAlert({ message }: { message: string }) {
  return (
    <Alert color="orange" variant="light" icon={<TriangleAlert size={18} aria-hidden />}>
      {message}
    </Alert>
  )
}
