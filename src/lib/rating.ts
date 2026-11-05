/**
 * Star ratings (tours and contents, from the likes/ratings plugin) shown with
 * one decimal in the visitor's language: "4,5" in Italian, "4.5" in English.
 * Shared by the badge text and its accessible name so both read the same.
 */
export function formatRating(average: number, lng: string) {
  return new Intl.NumberFormat(lng, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average)
}
