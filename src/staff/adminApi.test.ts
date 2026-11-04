import { describe, expect, it, vi } from 'vitest'
import { createAdminRecords } from './adminApi'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('createAdminRecords', () => {
  it('sends the staff token and only the admin read paths', async () => {
    const fetchImpl = vi.fn(async (_url: string) => json(200, { items: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchImpl)
    const records = createAdminRecords('https://api.example.test/api/v1/', async () => 'staff-token')
    await records.searchUsers('ada@example.com', null)
    await records.disputes('cursor-1')
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/api/v1/admin/users?q=ada%40example.com',
      expect.objectContaining({
        credentials: 'omit',
        headers: expect.objectContaining({ Authorization: 'Bearer staff-token' }),
      }),
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://api.example.test/api/v1/admin/disputes?cursor=cursor-1',
      expect.objectContaining({ credentials: 'omit' }),
    )
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('/auth/bootstrap')
    vi.unstubAllGlobals()
  })

  it('keeps denial, expiry, and outages distinct', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(403, {}))
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(404, {}))
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchImpl)
    const records = createAdminRecords('https://api.example.test/api/v1', async () => 'token')
    await expect(records.user('11111111-1111-4111-8111-111111111111')).resolves.toEqual({ ok: false, kind: 'denied' })
    await expect(records.user('11111111-1111-4111-8111-111111111111')).resolves.toEqual({ ok: false, kind: 'expired' })
    await expect(records.dispute('22222222-2222-4222-8222-222222222222')).resolves.toEqual({ ok: false, kind: 'not-found' })
    await expect(records.disputes(null)).resolves.toEqual({ ok: false, kind: 'unavailable' })
    vi.unstubAllGlobals()
  })
})
