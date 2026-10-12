import { ContentDetailsModal } from '@/components/mantine/ContentDetailsModal'
import { Content } from '@/payload-types'
import { useRouter } from 'next/navigation'

export default function StepModal({ content }: { content: Content }) {
  const router = useRouter()
  return <ContentDetailsModal content={content} opened onClose={router.back} />
}
