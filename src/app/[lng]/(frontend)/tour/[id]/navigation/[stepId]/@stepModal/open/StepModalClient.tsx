'use client'

import { Content } from '@/payload-types'
import { useRouter } from 'next/navigation'
import { StepModal } from './StepModal'

export function StepModalClient({ step }: { step: Content }) {
  const router = useRouter()
  return <StepModal opened onClose={() => router.back()} step={step} />
}
