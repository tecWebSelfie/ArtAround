import { Button, Card, Stack, Text, Title } from '@mantine/core'

/** Landing page when the buyer backs out of Stripe Checkout. Nothing was charged. */
export default async function CheckoutCancel(props: { params: Promise<{ lng: string }> }) {
  const { lng } = await props.params

  return (
    <Stack p="lg" maw={520} mx="auto">
      <Card withBorder p="lg">
        <Title order={2}>Checkout cancelled</Title>
        <Text mt="sm" c="dimmed">
          No payment was taken. You can try again whenever you like.
        </Text>
      </Card>
      <Button component="a" href={`/${lng}/frontend/stripe-test`}>
        Back to the shop
      </Button>
    </Stack>
  )
}
