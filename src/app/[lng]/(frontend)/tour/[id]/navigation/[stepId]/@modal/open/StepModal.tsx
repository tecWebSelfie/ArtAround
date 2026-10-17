import { Content } from '@/payload-types'
import { Stack, Title } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'

export function StepModal({ step: content }: { step: Content }) {
  return (
    <Stack justify="space-evenly" align="center">
      <Title>{content.title}</Title>
      <RichText data={content.body} />
    </Stack>
  )
}
