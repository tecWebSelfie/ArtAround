import type { z } from 'zod'
import { ExitEntranceNode } from './ExitEntranceNode'
import { ServiceNode } from './ServiceNode'

export type ServiceMarker = z.infer<typeof ServiceNode>
export type ExitEntranceMarker = z.infer<typeof ExitEntranceNode>

/**
 * Parse every museum marker out of any node record: a Payload `map` JSON blob,
 * an already-validated build, or the live editor scene. One helper so the
 * editor panel, the museum page badges and tour navigation agree on what a
 * service / entrance / exit is.
 */
export function collectMuseumMarkers(nodes: Record<string, unknown> | null | undefined): {
  services: ServiceMarker[]
  exitEntrances: ExitEntranceMarker[]
} {
  const services: ServiceMarker[] = []
  const exitEntrances: ExitEntranceMarker[] = []
  for (const node of Object.values(nodes ?? {})) {
    const service = ServiceNode.safeParse(node)
    if (service.success) {
      services.push(service.data)
      continue
    }
    const exitEntrance = ExitEntranceNode.safeParse(node)
    if (exitEntrance.success) exitEntrances.push(exitEntrance.data)
  }
  return { services, exitEntrances }
}

/** Read the `nodes` record out of a Payload `map` JSON field without trusting its shape. */
export function mapNodes(map: unknown): Record<string, unknown> | null {
  if (!map || typeof map !== 'object') return null
  const nodes = (map as { nodes?: unknown }).nodes
  return nodes && typeof nodes === 'object' ? (nodes as Record<string, unknown>) : null
}
