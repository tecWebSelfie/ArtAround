import type { Route } from 'next'
import { BackButton } from '@/components/navigation/BackButton'
import { MuseumCreateForm } from '@/components/editing/forms/MuseumCreateForm'
import { requireUser } from '@/lib/session'
import { Container } from '@mantine/core'

/** Any signed-in user may open a museum and becomes its director. */
export default async function NewMuseumPage({ params }: PageProps<'/[lng]/museum/new'>) {
  const { lng } = await params
  await requireUser(lng, `/${lng}/museum/new`)
  return (
    <Container size="md" py="md">
      {/* Up a level: back where the visitor came from, else the navigator. */}
      <BackButton href={`/${lng}/navigator` as Route} />
      <MuseumCreateForm />
    </Container>
  )
}
