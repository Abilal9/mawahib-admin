import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createSupabaseStaffAuth, safeSetupQr } from './supabaseAuth'

function createFakeClient() {
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: { access_token: 'token-1', user: { id: 'user-1' } } }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: { message: 'provider detail' } })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((callback: (event: string) => void) => {
      callback('TOKEN_REFRESHED')
      return { data: { subscription: { unsubscribe } } }
    }),
    mfa: {
      getAuthenticatorAssuranceLevel: vi.fn(async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })),
      listFactors: vi.fn(async () => ({
        data: {
          all: [
            { id: 'totp-1', factor_type: 'totp', status: 'verified' },
            { id: 'other-1', factor_type: 'webauthn', status: 'verified' },
          ],
        },
        error: null,
      })),
      enroll: vi.fn(async () => ({
        data: { id: 'totp-new', type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg></svg>', secret: 'SHOULD-NOT-BE-STORED', uri: 'otpauth://totp/example' } },
        error: null,
      })),
      challenge: vi.fn(async () => ({ data: { id: 'challenge-1' }, error: null })),
      verify: vi.fn(async () => ({ data: {}, error: { message: 'expired' } })),
    },
  }
  return { client: { auth } as unknown as SupabaseClient, auth, unsubscribe }
}

describe('createSupabaseStaffAuth', () => {
  it('uses the signed-in session and does not return provider error details', async () => {
    const { client, auth } = createFakeClient()
    const staff = createSupabaseStaffAuth(client)
    await expect(staff.getSession()).resolves.toEqual({ accessToken: 'token-1', userId: 'user-1' })
    await expect(staff.signInWithPassword('staff@example.com', 'pw')).resolves.toEqual({ error: 'sign-in-failed' })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'staff@example.com', password: 'pw' })
  })

  it('reports sign-out failure without the provider message', async () => {
    const { client, auth } = createFakeClient()
    auth.signOut.mockResolvedValueOnce({ error: { message: 'provider detail' } })
    const staff = createSupabaseStaffAuth(client)
    await expect(staff.signOut()).rejects.toThrow('sign-out-failed')
  })

  it('maps factors without dropping an unexpected type', async () => {
    const { client } = createFakeClient()
    const staff = createSupabaseStaffAuth(client)
    await expect(staff.listFactors()).resolves.toEqual([
      { id: 'totp-1', factorType: 'totp', status: 'verified' },
      { id: 'other-1', factorType: 'other', status: 'verified' },
    ])
    await expect(staff.assuranceLevel()).resolves.toBe('aal1')
  })

  it('returns the setup secret only to the caller and reports a failed code', async () => {
    const { client, auth } = createFakeClient()
    const staff = createSupabaseStaffAuth(client)
    await expect(staff.enrollTotp()).resolves.toEqual({
      ok: true,
      factorId: 'totp-new',
      secret: 'SHOULD-NOT-BE-STORED',
      qrCode: 'data:image/svg+xml;utf-8,<svg></svg>',
    })
    expect(auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Mawahib staff authenticator',
      issuer: 'Mawahib',
    })
    await expect(staff.verify({ factorId: 'totp-new', challengeId: 'challenge-1', code: '000000' })).resolves.toEqual({
      error: 'verify-failed',
    })
  })

  it('shows a setup QR only for a plain image data URL', () => {
    const qr = 'data:image/svg+xml;utf-8,<svg></svg>'
    expect(safeSetupQr(qr)).toBe(qr)
    expect(safeSetupQr('<svg></svg>')).toBeNull()
    expect(safeSetupQr('data:image/svg+xml;utf-8,<svg><script>alert(1)</script></svg>')).toBeNull()
    expect(safeSetupQr('data:image/svg+xml;utf-8,' + encodeURIComponent('<svg><script>alert(1)</script></svg>'))).toBeNull()
    expect(safeSetupQr('data:image/svg+xml;utf-8,<svg onclick="alert(1)"></svg>')).toBeNull()
  })

  it('maps refresh events and can unsubscribe', () => {
    const { client, unsubscribe } = createFakeClient()
    const staff = createSupabaseStaffAuth(client)
    const listener = vi.fn()
    const stop = staff.onAuthStateChange(listener)
    expect(listener).toHaveBeenCalledWith('token-refreshed', { accessToken: null, userId: null })
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
