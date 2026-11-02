/**
 * The step route and the tour's own @modal slot (`/open`, `/content/ID`,
 * `/object/ID`) render over the one map of the museum navigation layout while
 * the browser URL changes.
 */
export default function NavigationLayout({
  children,
  modal,
}: LayoutProps<'/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]'>) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
