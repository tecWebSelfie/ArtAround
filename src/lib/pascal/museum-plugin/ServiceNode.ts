import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

/**
 * Museum services (toilets, food, shop, info point) are Pascal `analysis` nodes
 * placed on the map. They replace the legacy `Museums.services` Payload group:
 * the saved scene-graph JSON is now the single source of truth, so a service is
 * just a marker node and never collides with the navmesh (analysis nodes are
 * excluded from Pascal's collider world).
 */
export const SERVICE_NODE_TYPE = 'museum:service'

/** Persisted service ids. Stable: they appear in saved map JSON and share URLs. */
export const SERVICE_TYPES = ['bathrooms', 'food', 'shop', 'infoPoint'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

/**
 * One opening-hours row. Mirrors the `opening` / `closing` pair of
 * `src/fields/OpeningHours.ts`; times are stored as `HH:mm` strings (the shape
 * the museum mocks already use) rather than full dates, because a node has no
 * timezone and the editor edits times of day only.
 */
const daySchedule = z.array(
  z.object({
    opening: z.string().nullable().optional(),
    closing: z.string().nullable().optional(),
  }),
)

/** Weekly schedule + notes, structurally identical to the museum `OpeningHours` field. */
export const ServiceOpeningHours = z.object({
  monday: daySchedule.optional(),
  tuesday: daySchedule.optional(),
  wednesday: daySchedule.optional(),
  thursday: daySchedule.optional(),
  friday: daySchedule.optional(),
  saturday: daySchedule.optional(),
  sunday: daySchedule.optional(),
  notes: z.string().nullable().optional(),
})
export type ServiceOpeningHours = z.infer<typeof ServiceOpeningHours>

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export const ServiceNode = BaseNode.extend({
  id: objectId('service'),
  type: nodeType(SERVICE_NODE_TYPE),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  service: z.enum(SERVICE_TYPES),
  /**
   * False until staff drop the marker on the map: services can be authored
   * without a position (no coordinates yet), and the editor panel highlights
   * those until they are placed.
   */
  placed: z.boolean().default(false),
  openingHours: ServiceOpeningHours.optional(),
})
