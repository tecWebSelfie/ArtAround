/** The step route and @modal slot share one map while the browser URL changes. */
export default function NavigationLayout({
  children,
  modal,
}: LayoutProps<'/[lng]/tour/[id]/navigation/[stepId]'>) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
