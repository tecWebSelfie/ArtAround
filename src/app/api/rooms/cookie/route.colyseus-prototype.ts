/**
 * PROTOTYPE (throwaway): the group room sends each member a signed
 * private-tour token; this sets it as the httpOnly group cookie, which only
 * Next can do. Replaces the cookie part of `/api/rooms/token`.
 */
import { GROUP_TOUR_COOKIE, GROUP_TOUR_TOKEN_HOURS, verifyGroupTourToken } from '@/lib/visibility'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const token = await request.text()
  if (!(await verifyGroupTourToken(token))) return new NextResponse(null, { status: 400 })
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(GROUP_TOUR_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GROUP_TOUR_TOKEN_HOURS * 3600,
  })
  return response
}
