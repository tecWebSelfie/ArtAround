/** Shared navigation action geometry: at least 44 px, with labels allowed to wrap at 200% text. */
export const NAVIGATION_ACTION_CLASS =
  'h-auto min-h-11 max-w-full py-2 [&_.mantine-Button-label]:whitespace-normal [&_.mantine-Button-label]:text-wrap'

/**
 * Compact map controls: 36 px to the eye, still a 44 px target (The
 * Navigation Reach Rule) through an invisible 4 px ring around the control.
 */
export const NAVIGATION_HIT_AREA = "relative after:absolute after:-inset-1 after:content-['']"

/** A compact labelled pill over the map: wraps at large text, 44 px target. */
export const NAVIGATION_COMPACT_ACTION_CLASS = `${NAVIGATION_HIT_AREA} h-auto min-h-9 max-w-full py-1.5 [&_.mantine-Button-label]:whitespace-normal [&_.mantine-Button-label]:text-wrap`
