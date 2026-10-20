export default function MuseumIdLayout({ children, object }: LayoutProps<'/[lng]/museum/[id]'>) {
  return (
    <>
      {children}
      {object}
    </>
  )
}
