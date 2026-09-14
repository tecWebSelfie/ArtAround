// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),
  http.post('/api/livekit/token', () => {
    return HttpResponse.json({
      token: 'mock-token',
      url: 'ws://localhost:7880',
      room: 'voice-guest-mock',
      identity: 'guest-mock',
      guest: true,
    })
  }),
]
