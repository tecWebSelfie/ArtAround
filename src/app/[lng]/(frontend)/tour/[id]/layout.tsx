export default function TourLayout({ children, step }: LayoutProps<'/[lng]/tour/[id]'>) {
  return (
    <>
      {children}
      {step}
    </>
  )
}
