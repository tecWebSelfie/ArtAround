'use client'

import { Content } from '@/payload-types'
import { Stack, StackProps, Title } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'

export function StepModalBody({
  step: content,
  ...props
}: { step: Content } & Omit<StackProps, 'content'>) {
  return (
    <Stack {...props} justify="space-evenly" align="center">
      <Title>{content.title}</Title>
      <RichText data={content.body} />
    </Stack>
  )
}
