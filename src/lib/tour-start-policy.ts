/**
 * Shared rule for every tour entry point: visitors need access to all paid
 * stops, while a tour editor may still preview and lead their own tour.
 */
export function canStartPaidTour(lockedPrice: number, canEdit: boolean) {
  return lockedPrice === 0 || canEdit
}
