/**
 * Image shown wherever a museum, tour, object or content has no usable
 * thumbnail yet (cards, carousels, detail modals). Kept in one place so the
 * stand-in can later be swapped for a branded asset without hunting copies.
 *
 * An inline SVG rather than a remote "Placeholder" text image: a soft gray
 * gradient with a faint picture-frame mark reads as "no photo yet" in any
 * language, needs no network request, and stays legible under the dark
 * title scrims the carousels lay over their cards.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#f1f3f5"/><stop offset="1" stop-color="#dee2e6"/></linearGradient></defs>
<rect width="600" height="400" fill="url(#g)"/>
<g transform="translate(264 164)" fill="none" stroke="#adb5bd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<rect x="3" y="3" width="66" height="66" rx="8"/><circle cx="24" cy="24" r="6"/><path d="m69 47-12-12a6 6 0 0 0-8 0L13 69"/></g>
</svg>`

export const PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(svg)}`
