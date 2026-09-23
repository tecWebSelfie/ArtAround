import { getPayload } from 'payload'
import config from '@/payload.config'

try {
  const payload = await getPayload({ config })

  console.log('Seeding database...')
  console.log('Creating super admin user if it does not exist...')
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: 'dev@payloadcms.com' } },
    limit: 1,
  })
  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'users',
      data: { username: 'dev', email: 'dev@payloadcms.com', password: 'test', isSuperAdmin: true },
    })
  } else {
    console.log('SuperAdmin user already exists, skipping')
  }

  console.log('Database seeded successfully. Closing connection...')
  await payload.destroy()
  console.log('Payload connection closed. Exiting process.')
  process.exit(0)
} catch (e) {
  console.error('Error seeding database:', e)
  process.exit(1)
}
