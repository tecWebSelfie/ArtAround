import { Button, Card, Stack, Text, Title } from '@mantine/core'
import { checkoutReturnPath } from '../return-path'

/** Landing page when the buyer backs out of Stripe Checkout. Nothing was charged. */
export default async function CheckoutCancel(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<{ collection?: string | string[]; id?: string | string[] }>
}) {
  const { lng } = await props.params
  const search = await props.searchParams

  return (
    <Stack p="lg" maw={520} mx="auto">
      <Card withBorder p="lg">
        <Title order={2}>Checkout cancelled</Title>
        <Text mt="sm" c="dimmed">
          No payment was taken. You can try again whenever you like.
        </Text>
      </Card>
      <Button component="a" href={checkoutReturnPath(lng, search)}>
        Go back
      </Button>
    </Stack>
  )
}
