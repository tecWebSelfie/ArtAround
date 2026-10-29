import { LinkButton } from '@/components/editing/LinkButton'
import { AppShellFooter, AppShellMain, Box, Container, Stack, Text, Title } from '@mantine/core'
import { ArrowRight } from 'lucide-react'
import type { Route } from 'next'

/**
 * Shared frame of the Stripe landing pages (success, cancel). They are focused
 * task pages (DESIGN.md → Layout): one `Container size="xs"` reading column in
 * `AppShellMain`, and the single way forward full-width in the 64px footer
 * (The Thumb-Reach Rule), so a buyer back from Stripe knows where to go next.
 * From md there is no thumb to reach for: the same action sits right under
 * the message instead of ~600px below it, and the footer is hidden.
 */
export function CheckoutOutcome({
  title,
  description,
  detail,
  action,
}: {
  title: string
  description: string
  /** Secondary line, e.g. the Stripe reference to quote to support. */
  detail?: string
  action: { label: string; href: Route }
}) {
  const forward = (
    <LinkButton href={action.href} fullWidth size="md" rightSection={<ArrowRight size={18} />}>
      {action.label}
    </LinkButton>
  )
  return (
    <>
      <AppShellMain>
        <Container size="xs" px="md" py="xl">
          <Stack gap={4}>
            <Title order={1}>{title}</Title>
            <Text c="dimmed">{description}</Text>
            {detail && (
              <Text c="dimmed" size="xs" mt="sm">
                {detail}
              </Text>
            )}
          </Stack>
          <Box visibleFrom="md" mt="xl">
            {forward}
          </Box>
        </Container>
      </AppShellMain>
      <AppShellFooter p="xs" hiddenFrom="md">
        <Container size="xs" px="md">
          {forward}
        </Container>
      </AppShellFooter>
    </>
  )
}
