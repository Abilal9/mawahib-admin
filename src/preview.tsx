import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { StaffPortal } from './staff/StaffPortal'
import type { StaffAccessClient, StaffAuthClient } from './staff/types'

const previewRoot: { current: Root | null } = { current: null }

export function mountPreview(element: HTMLElement, mode: string) {
  previewRoot.current = createRoot(element)
  previewRoot.current.render(
    <StrictMode>
      <p className="preview-banner">Preview only. This is not a staff session.</p>
      <StaffPortal auth={previewAuth(mode)} access={previewAccess(mode)} />
    </StrictMode>,
  )
}

const previewSecret = 'PREVIEW-SECRET-NOT-A-REAL-FACTOR'
const previewQr =
  'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23ffffff"/></svg>'

function previewAuth(mode: string): StaffAuthClient {
  let active = mode !== 'signed-out' && mode !== 'sign-in-error'
  return {
    async getSession() {
      if (!active) return { accessToken: null, userId: null }
      return { accessToken: 'preview-token', userId: 'preview-user' }
    },
    async signInWithPassword() {
      return { error: mode === 'sign-in-error' ? 'failed' : null }
    },
    async signOut() {
      active = false
    },
    async assuranceLevel() {
      if (mode === 'accepted' || mode === 'denied' || mode === 'unavailable') return 'aal2'
      return 'aal1'
    },
    async listFactors() {
      if (mode === 'setup') return []
      if (mode === 'operator-help') return [{ id: 'phone-1', factorType: 'phone', status: 'verified' }]
      if (mode === 'challenge' || mode === 'accepted' || mode === 'denied' || mode === 'unavailable') {
        return [{ id: 'totp-1', factorType: 'totp', status: 'verified' }]
      }
      return []
    },
    async enrollTotp() {
      return { ok: true, factorId: 'preview-factor', secret: previewSecret, qrCode: previewQr }
    },
    async challenge() {
      return { ok: true, challengeId: 'preview-challenge' }
    },
    async verify() {
      return { error: null }
    },
    onAuthStateChange() {
      return () => undefined
    },
  }
}

function previewAccess(mode: string): StaffAccessClient {
  return {
    async check() {
      if (mode === 'accepted') return { ok: true, role: 'operator' }
      if (mode === 'unavailable') return { ok: false, kind: 'unavailable' }
      return { ok: false, kind: 'denied' }
    },
  }
}
