export default function TourLayout({ children, content }: LayoutProps<'/[lng]/tour/[id]'>) {
  return (
    <>
      {children}
      {content}
    </>
  )
}
