import { NavigationModal } from './NavigationModal'

export default function NavigationLayout({
  children,
  modal,
}: LayoutProps<'/[lng]/tour/[id]/navigation/[stepId]'>) {
  return (
    <>
      {children}
      {modal && <NavigationModal>{modal}</NavigationModal>}
    </>
  )
}
