import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, getSession } from './auth'

describe('signToken / verifyToken', () => {
  it('round-trips a payload', async () => {
    const token = await signToken({ userId: 'u1', email: 'a@example.com' })
    const payload = await verifyToken(token)
    expect(payload?.userId).toBe('u1')
    expect(payload?.email).toBe('a@example.com')
  })

  it('returns null for a garbage token', async () => {
    expect(await verifyToken('not.a.jwt')).toBeNull()
  })

  it('returns null for a token with a tampered signature', async () => {
    const token = await signToken({ userId: 'u1', email: 'a@example.com' })
    const tampered = token.slice(0, -6) + 'aaaaaa'
    expect(await verifyToken(tampered)).toBeNull()
  })

  it('returns null for an empty string', async () => {
    expect(await verifyToken('')).toBeNull()
  })
})

describe('getSession', () => {
  it('extracts session from a valid cookie', async () => {
    const token = await signToken({ userId: 'u2', email: 'b@example.com' })
    const request = new Request('http://localhost/', {
      headers: { cookie: `session=${token}` },
    })
    const session = await getSession(request)
    expect(session?.userId).toBe('u2')
    expect(session?.email).toBe('b@example.com')
  })

  it('returns null when there is no cookie', async () => {
    const request = new Request('http://localhost/')
    expect(await getSession(request)).toBeNull()
  })

  it('returns null when the cookie value is invalid', async () => {
    const request = new Request('http://localhost/', {
      headers: { cookie: 'session=invalid' },
    })
    expect(await getSession(request)).toBeNull()
  })
})
