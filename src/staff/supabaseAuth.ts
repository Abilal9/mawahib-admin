import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSessionAuthStorage } from './sessionStorage'
import type { AuthFactor, StaffAuthClient, StaffAuthEvent } from './types'

type FactorRow = {
  id: string
  factor_type: string
  status: string
}

export function createStaffBrowserClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: {
      // Tab sessionStorage. Closing the tab drops it. This does not stop scripts in the page.
      storage: createSessionAuthStorage(window.sessionStorage),
      persistSession: true,
      // Renew the session while this tab is open. TOKEN_REFRESHED repeats the staff-access check.
      autoRefreshToken: true,
      // Invitation links are accepted explicitly. A hash must not become a session by itself.
      detectSessionInUrl: false,
    },
  })
}

export function createBrowserStaffAuth(url: string, publishableKey: string): StaffAuthClient {
  return createSupabaseStaffAuth(createStaffBrowserClient(url, publishableKey))
}

export function createSupabaseStaffAuth(client: SupabaseClient): StaffAuthClient {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error || !data.session?.access_token || !data.session.user?.id) {
        return { accessToken: null, userId: null }
      }
      return { accessToken: data.session.access_token, userId: data.session.user.id }
    },
    async signInWithPassword(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      return { error: error ? 'sign-in-failed' : null }
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw new Error('sign-out-failed')
    },
    async assuranceLevel() {
      const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) return null
      if (data.currentLevel === 'aal2') return 'aal2'
      if (data.currentLevel === 'aal1') return 'aal1'
      return null
    },
    async listFactors() {
      const { data, error } = await client.auth.mfa.listFactors()
      if (error) throw new Error('factor-list-failed')
      return data.all.map(toFactor)
    },
    async enrollTotp() {
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Mawahib staff authenticator',
        issuer: 'Mawahib',
      })
      if (error || data.type !== 'totp' || !data.totp.secret) return { ok: false as const, error: 'enroll-failed' }
      return { ok: true as const, factorId: data.id, secret: data.totp.secret, qrCode: safeSetupQr(data.totp.qr_code) }
    },
    async challenge(factorId) {
      const { data, error } = await client.auth.mfa.challenge({ factorId })
      if (error) return { ok: false as const, error: 'challenge-failed' }
      return { ok: true as const, challengeId: data.id }
    },
    async verify({ factorId, challengeId, code }) {
      const { error } = await client.auth.mfa.verify({ factorId, challengeId, code })
      return { error: error ? 'verify-failed' : null }
    },
    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        listener(mapAuthEvent(event), {
          accessToken: session?.access_token ?? null,
          userId: session?.user?.id ?? null,
        })
      })
      return () => data.subscription.unsubscribe()
    },
  }
}

export function safeSetupQr(value: string): string | null {
  const prefix = 'data:image/svg+xml;utf-8,'
  if (!value.startsWith(prefix)) return null
  let payload = value.slice(prefix.length)
  try {
    payload = decodeURIComponent(payload)
  } catch {
    return null
  }
  const normalized = payload.toLowerCase().replace(/\s+/g, '')
  const start = normalized.indexOf('<svg')
  if (start < 0 || !normalized.endsWith('</svg>')) return null
  const before = normalized.slice(0, start)
  if (before && !before.startsWith('<?xml')) return null
  if (normalized.includes('<script') || normalized.includes('javascript:') || /on[a-z]+=/.test(normalized)) return null
  return value
}

function toFactor(factor: FactorRow): AuthFactor {
  const factorType = factor.factor_type === 'totp' || factor.factor_type === 'phone' ? factor.factor_type : 'other'
  const status = factor.status === 'verified' ? 'verified' : 'unverified'
  return { id: factor.id, factorType, status }
}

function mapAuthEvent(event: string): StaffAuthEvent {
  switch (event) {
    case 'INITIAL_SESSION':
      return 'initial'
    case 'SIGNED_IN':
      return 'signed-in'
    case 'SIGNED_OUT':
      return 'signed-out'
    case 'TOKEN_REFRESHED':
      return 'token-refreshed'
    case 'USER_UPDATED':
      return 'user-updated'
    case 'PASSWORD_RECOVERY':
      return 'password-recovery'
    case 'MFA_CHALLENGE_VERIFIED':
      return 'mfa-verified'
    default:
      return 'user-updated'
  }
}
