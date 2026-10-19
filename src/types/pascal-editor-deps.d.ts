// `@pascal-app/editor` ships TypeScript source that imports these untyped
// packages (PDF floor-plan export; `howler` uses @types/howler). Next's build typechecks
// that source, so declare them here; we never call them directly.
declare module 'pdfkit'
declare module 'pdfkit/js/pdfkit.standalone'
declare module 'blob-stream'
