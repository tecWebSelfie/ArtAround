import { getPayload } from 'payload'
import config from '@/payload.config'

try {
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'users',
    data: { username: 'dev', email: 'dev@payloadcms.com', password: 'test', isSuperAdmin: true },
  })

  await payload.destroy()
  process.exit(0)
} catch (e) {
  console.error('Error seeding database:', e)
  process.exit(1)
}
