import { Container, Paper, Stack } from '@mantine/core'

/**
 * Chrome for the standalone auth screens (`/login`, `/signup`). They live
 * outside the `(tabs)` group on purpose: no bottom navbar, just a centered card.
 * The 64px offset reserves the AppShell footer slot inherited from the
 * `(frontend)` layout.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container size="xs" py="xl">
      <Stack justify="center" mih="calc(100dvh - 64px)">
        <Paper withBorder shadow="sm" radius="lg" p={{ base: 'md', sm: 'xl' }}>
          {children}
        </Paper>
      </Stack>
    </Container>
  )
}
