import NavigatorHomePage from './NavigatorPage'

export default async function NavigatorHome({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params
  return <NavigatorHomePage lng={lng} />
}
