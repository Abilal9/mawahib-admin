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
    await records.disputeCases({ q: '', statuses: [], assignment: [], engagementState: [], cursor: 'cursor-1' })
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
      'https://api.example.test/api/v1/admin/dispute-cases?cursor=cursor-1',
      expect.objectContaining({ credentials: 'omit' }),
    )
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('/auth/bootstrap')
    await records.operations()
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'https://api.example.test/api/v1/admin/operations',
      expect.objectContaining({ credentials: 'omit' }),
    )
    vi.unstubAllGlobals()
  })

  it('reports only the current status after a lost response', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(json(200, { accountStatus: 'SUSPENDED', statusAction: 'restore' }))
    vi.stubGlobal('fetch', fetchImpl)
    const records = createAdminRecords('https://api.example.test/api/v1', async () => 'token')
    await expect(
      records.setAccountStatus('11111111-1111-4111-8111-111111111111', {
        status: 'SUSPENDED',
        expectedStatus: 'ACTIVE',
        reason: 'Review hold',
      }),
    ).resolves.toEqual({ ok: true, data: { outcome: 'observed', accountStatus: 'SUSPENDED' } })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })

  it('does not hide a denied reconciliation as an unknown result', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(json(403, { code: 'STAFF_ACCESS_DENIED' }))
    vi.stubGlobal('fetch', fetchImpl)
    const records = createAdminRecords('https://api.example.test/api/v1', async () => 'token')
    await expect(
      records.setAccountStatus('11111111-1111-4111-8111-111111111111', {
        status: 'SUSPENDED',
        expectedStatus: 'ACTIVE',
        reason: 'Review hold',
      }),
    ).resolves.toEqual({ ok: false, kind: 'denied' })
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
    await expect(records.disputeCase('22222222-2222-4222-8222-222222222222')).resolves.toEqual({ ok: false, kind: 'not-found' })
    await expect(records.disputeCases({ q: '', statuses: [], assignment: [], engagementState: [], cursor: null })).resolves.toEqual({ ok: false, kind: 'unavailable' })
    vi.unstubAllGlobals()
  })
})
