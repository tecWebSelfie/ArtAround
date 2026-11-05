import { BackToNavigator } from '@/components/navigation/BackToNavigator'
import { Container, Stack } from '@mantine/core'

/**
 * Chrome for the standalone auth screens (`/login`, `/signup`). They live
 * outside the `(tabs)` group on purpose: no bottom navbar, so on phones
 * `BackToNavigator` is their way home. The column matches "Plan my visit"
 * (`Container size="xs"`, `py="xl"`): a plain form on the page, not a raised
 * card, per DESIGN.md's Functional-First Rule.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container size="xs" py="xl">
      <Stack gap="lg">
        <BackToNavigator />
        {children}
      </Stack>
    </Container>
  )
}
