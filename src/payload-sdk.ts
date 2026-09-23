import { PayloadSDK } from '@payloadcms/sdk'

export const payloadSdk = new PayloadSDK({
  baseURL: process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000',
})
