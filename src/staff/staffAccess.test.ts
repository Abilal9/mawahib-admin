import { describe, expect, it, vi } from 'vitest'
import { createStaffAccessClient } from './staffAccess'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createStaffAccessClient', () => {
  it('accepts only an active operator session', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { role: 'operator', membership: 'active' }))
    const client = createStaffAccessClient('https://api.example.test/api/v1/', fetchImpl)
    await expect(client.check('staff-token')).resolves.toEqual({ ok: true, role: 'operator' })
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.test/api/v1/admin/session', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json', Authorization: 'Bearer staff-token' },
    })
  })

  it('does not treat a generic denial as a pending-membership signal', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(403, { code: 'STAFF_ACCESS_DENIED', message: 'Staff access is required.' }))
    const client = createStaffAccessClient('https://api.example.test/api/v1', fetchImpl)
    await expect(client.check('staff-token')).resolves.toEqual({ ok: false, kind: 'denied' })
  })

  it('separates an expired session, a bad payload, and a network failure', async () => {
    const expired = createStaffAccessClient('https://api.example.test/api/v1', vi.fn(async () => jsonResponse(401, {})))
    const malformed = createStaffAccessClient('https://api.example.test/api/v1', vi.fn(async () => jsonResponse(200, { role: 'operator' })))
    const broken = createStaffAccessClient('https://api.example.test/api/v1', vi.fn(async () => jsonResponse(503, {})))
    const offline = createStaffAccessClient(
      'https://api.example.test/api/v1',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    await expect(expired.check('token')).resolves.toEqual({ ok: false, kind: 'expired' })
    await expect(malformed.check('token')).resolves.toEqual({ ok: false, kind: 'denied' })
    await expect(broken.check('token')).resolves.toEqual({ ok: false, kind: 'unavailable' })
    await expect(offline.check('token')).resolves.toEqual({ ok: false, kind: 'unavailable' })
  })
})
