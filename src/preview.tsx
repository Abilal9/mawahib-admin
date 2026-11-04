import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AdminRecords, AdminRoute, StaffDispute, StaffUserDetail, StaffUserSummary } from './staff/adminTypes'
import { StaffPortal } from './staff/StaffPortal'
import type { StaffAccessClient, StaffAuthClient } from './staff/types'

const previewUserId = '11111111-1111-4111-8111-111111111111'
const previewDisputeId = '22222222-2222-4222-8222-222222222222'

const previewUser: StaffUserSummary = {
  id: previewUserId,
  email: 'ada.preview@example.com',
  username: 'ada-preview',
  displayName: 'Ada Preview',
  accountType: 'talent',
  accountStatus: 'ACTIVE',
  createdAt: '2026-01-04T00:00:00.000Z',
  deletedAt: null,
}

const previewUserDetail: StaffUserDetail = {
  ...previewUser,
  followersCount: 4,
  followingCount: 2,
  postsCount: 6,
  clientEngagementCount: 1,
  providerEngagementCount: 3,
  simulatedPaymentCount: 1,
}

const previewDispute: StaffDispute = {
  id: previewDisputeId,
  title: 'Preview poster',
  status: 'disputed',
  updatedAt: '2026-02-02T00:00:00.000Z',
  deletedAt: null,
  clientDisplayName: 'Ada Preview',
  providerDisplayName: 'Nour Preview',
  disputeEventId: '33333333-3333-4333-8333-333333333333',
  disputeAt: '2026-02-02T00:00:00.000Z',
  disputeNote: 'Synthetic dispute note',
  payment: { amount: '150.00', currency: 'SAR', status: 'succeeded', simulated: true },
}

const previewRoot: { current: Root | null } = { current: null }

export function mountPreview(element: HTMLElement, mode: string) {
  previewRoot.current = createRoot(element)
  previewRoot.current.render(
    <StrictMode>
      <p className="preview-banner">Preview only. This is not a staff session.</p>
      <StaffPortal
        auth={previewAuth(mode)}
        access={previewAccess(mode)}
        records={previewRecords(mode)}
        initialRoute={previewRoute(mode)}
      />
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
      if (mode === 'denied' || mode === 'unavailable' || isStaffPreview(mode)) return 'aal2'
      return 'aal1'
    },
    async listFactors() {
      if (mode === 'setup') return []
      if (mode === 'operator-help') return [{ id: 'phone-1', factorType: 'phone', status: 'verified' }]
      if (mode === 'challenge' || mode === 'denied' || mode === 'unavailable' || isStaffPreview(mode)) {
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

function isStaffPreview(mode: string): boolean {
  return [
    'accepted',
    'users',
    'user',
    'disputes',
    'dispute',
    'users-empty',
    'users-error',
    'disputes-empty',
    'disputes-error',
  ].includes(mode)
}

function previewRoute(mode: string): AdminRoute | undefined {
  if (mode === 'users' || mode === 'users-error') return { name: 'users', query: 'ada', cursor: null }
  if (mode === 'users-empty') return { name: 'users', query: 'nobody', cursor: null }
  if (mode === 'user') return { name: 'user', id: previewUserId }
  if (mode === 'disputes' || mode === 'disputes-empty' || mode === 'disputes-error') {
    return { name: 'disputes', cursor: null }
  }
  if (mode === 'dispute') return { name: 'dispute', id: previewDisputeId }
  if (mode === 'accepted') return { name: 'home' }
  return undefined
}

function previewRecords(mode: string): AdminRecords {
  const usersFailed = mode === 'users-error'
  const usersEmpty = mode === 'users-empty'
  const disputesFailed = mode === 'disputes-error'
  const disputesEmpty = mode === 'disputes-empty'
  return {
    async searchUsers() {
      if (usersFailed) return { ok: false, kind: 'unavailable' }
      if (usersEmpty) return { ok: true, data: { items: [], nextCursor: null } }
      return { ok: true, data: { items: [previewUser], nextCursor: null } }
    },
    async user() {
      return { ok: true, data: previewUserDetail }
    },
    async disputes() {
      if (disputesFailed) return { ok: false, kind: 'unavailable' }
      if (disputesEmpty) return { ok: true, data: { items: [], nextCursor: null } }
      return { ok: true, data: { items: [previewDispute], nextCursor: null } }
    },
    async dispute() {
      return { ok: true, data: previewDispute }
    },
  }
}

function previewAccess(mode: string): StaffAccessClient {
  return {
    async check() {
      if (mode === 'unavailable') return { ok: false, kind: 'unavailable' }
      if (isStaffPreview(mode)) return { ok: true, role: 'operator' }
      return { ok: false, kind: 'denied' }
    },
  }
}
