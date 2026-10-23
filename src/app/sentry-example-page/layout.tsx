// Root layout for Sentry's wizard demo page, which sits outside the `[lng]` and
// `(payload)` trees and so has no ancestor layout since the top-level
// `src/app/layout.tsx` was removed. Next 16.3 rendered it without <html>/<body>;
// Next 16.4 fails the build instead, so this segment declares its own document.
export default function SentryExampleLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
