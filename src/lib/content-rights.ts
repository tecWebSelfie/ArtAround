/**
 * Rights of a content (an "item" in the course specification): who holds them
 * and the licence others may use it under. Shared by the `contents` and
 * `tours` collection hooks, the editor form and the content page's credit
 * line, so the rules live in one place.
 *
 * - The holder is the author, or a museum the author is at least curator of
 *   (`rightsMuseum`). Texts owned by third parties are not accepted: authors
 *   declare, when creating a content, that it is theirs (`rightsDeclaredAt`).
 * - Licences are Creative Commons ones plus "all rights reserved". No ND
 *   ("no derivatives") variant: the app derives translations, simplified and
 *   children's versions from every content, and ND would forbid them.
 * - A paid content is always "all rights reserved": the buyer gets personal
 *   use, not a licence to republish it.
 * - An NC ("non commercial") content of another author can't be part of a
 *   tour that sells contents: the package as a whole is commercial use.
 */

export const LICENSES = [
  'cc0',
  'cc-by',
  'cc-by-sa',
  'cc-by-nc',
  'cc-by-nc-sa',
  'all-rights-reserved',
] as const

export type License = (typeof LICENSES)[number]

/** The licence a new free content starts with: attribution only. */
export const DEFAULT_LICENSE: License = 'cc-by'
/** The only licence a paid content can have. */
export const PAID_LICENSE: License = 'all-rights-reserved'

/** Short public names; "all rights reserved" goes through i18n (`LICENSE_LABEL_KEY`). */
export const LICENSE_NAME: Record<License, string> = {
  cc0: 'CC0 1.0',
  'cc-by': 'CC BY 4.0',
  'cc-by-sa': 'CC BY-SA 4.0',
  'cc-by-nc': 'CC BY-NC 4.0',
  'cc-by-nc-sa': 'CC BY-NC-SA 4.0',
  'all-rights-reserved': 'All rights reserved',
}

/** Official deed of each Creative Commons licence, linked from the credit line. */
export const LICENSE_URL: Partial<Record<License, string>> = {
  cc0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-sa': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}

export const isLicense = (value: unknown): value is License =>
  typeof value === 'string' && (LICENSES as readonly string[]).includes(value)

/** True for licences that forbid commercial use by others. */
const isNonCommercial = (license: License | null | undefined) =>
  license === 'cc-by-nc' || license === 'cc-by-nc-sa'

/** The licence a content is saved with: a price forces "all rights reserved". */
export function effectiveLicense(
  price: number | null | undefined,
  license: License | null | undefined,
): License {
  if (price && price > 0) return PAID_LICENSE
  return license ?? DEFAULT_LICENSE
}

type TourContent = {
  price?: number | null
  license?: License | null
  author?: string | null
}

/**
 * The contents that make a tour break an NC licence: when the tour sells at
 * least one content, every NC content by someone other than the tour's author
 * (who may use their own work commercially) is a violation.
 */
export function nonCommercialConflicts<T extends TourContent>(
  contents: T[],
  tourAuthor: string | null | undefined,
): T[] {
  if (!contents.some((content) => (content.price ?? 0) > 0)) return []
  return contents.filter(
    (content) => isNonCommercial(content.license) && content.author !== tourAuthor,
  )
}

/** Parts of the credit line under a content: "© holder year · licence". */
export function creditLine({
  holder,
  createdAt,
  license,
}: {
  holder: string | null | undefined
  createdAt: string | null | undefined
  license: License | null | undefined
}) {
  const year = createdAt ? new Date(createdAt).getUTCFullYear() : null
  return {
    copyright: holder ? `© ${holder}${year ? ` ${year}` : ''}` : null,
    license: license ?? null,
  }
}
