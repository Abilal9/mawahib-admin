import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AdminRecords, AdminRoute, OperationsOverview, StaffDispute, StaffUserDetail, StaffUserSummary } from './staff/adminTypes'
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
  statusAction: 'suspend',
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

function previewOperations(mode: string): OperationsOverview {
  const fetchedAt = '2026-11-05T09:00:00.000Z'
  const base = {
    stale: false,
    fetchedAt,
    eventAt: '2026-11-05T08:30:00.000Z',
    incidents: [],
    details: [] as { label: string; value: string }[],
  }
  const cards: OperationsOverview['cards'] = [
    {
      ...base,
      id: 'railway',
      title: 'API deployment',
      state: mode === 'operations-unavailable' ? 'unavailable' : 'up',
      summary:
        mode === 'operations-unavailable'
          ? 'The provider did not respond in time. This is not a confirmed outage.'
          : 'Railway reports a successful deployment in the recent list. A successful record is deployment evidence, not continuous application-health proof.',
      details: [
        { label: 'Service', value: '11111111-1111-4111-8111-111111111111' },
        { label: 'Release', value: 'abc1234' },
      ],
      dashboardUrl: 'https://railway.com/dashboard',
    },
    {
      ...base,
      id: 'database',
      title: 'Database connectivity',
      state: 'up',
      stale: mode === 'operations-stale',
      fetchedAt: mode === 'operations-stale' ? '2026-11-05T08:00:00.000Z' : fetchedAt,
      summary: 'The application database accepted a connectivity check.',
      details: [{ label: 'Check', value: 'SELECT 1' }],
      dashboardUrl: 'https://supabase.com/dashboard',
    },
    {
      ...base,
      id: 'supabase_project',
      title: 'Supabase project',
      state: 'up',
      summary: 'Supabase reports this project as ACTIVE_HEALTHY.',
      details: [{ label: 'Project', value: 'abcdefghijklmnopqrst' }],
      dashboardUrl: 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst',
    },
    {
      ...base,
      id: 'supabase_backup',
      title: 'Database backup',
      state: 'up',
      summary: 'The latest returned backup is COMPLETED. This does not prove it can be restored.',
      details: [{ label: 'Backup status', value: 'COMPLETED' }],
      dashboardUrl: 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst',
    },
    {
      ...base,
      id: 'uptime',
      title: 'Production monitor',
      state: mode === 'operations-unconfigured' ? 'not_configured' : mode === 'operations-incident' ? 'down' : 'up',
      summary:
        mode === 'operations-unconfigured'
          ? 'Not configured. Set OPS_UPTIMEROBOT_READ_TOKEN and OPS_UPTIMEROBOT_MONITOR_ID on the server.'
          : mode === 'operations-incident'
            ? 'UptimeRobot reports this monitor as DOWN. This is a periodic observation, not a deployment check.'
            : 'UptimeRobot reports this monitor as UP. This is a periodic observation, not a deployment check.',
      fetchedAt: mode === 'operations-unconfigured' ? null : fetchedAt,
      eventAt: mode === 'operations-incident' ? '2026-11-05T09:40:00.000Z' : null,
      details:
        mode === 'operations-unconfigured'
          ? []
          : [
              { label: 'Monitor', value: '794581023' },
              { label: 'Last check', value: 'Not exposed by the API' },
            ],
      incidents:
        mode === 'operations-incident'
          ? [{ at: '2026-11-05T09:40:00.000Z', label: 'DOWN' }]
          : [],
      dashboardUrl: 'https://dashboard.uptimerobot.com/',
    },
  ]
  return { generatedAt: '2026-11-05T10:00:00.000Z', cards }
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
        initialNotice={previewNotice(mode)}
        startConfirming={mode === 'user-confirm'}
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
      if (mode === 'denied' || mode === 'operations-denied' || mode === 'unavailable' || isStaffPreview(mode)) return 'aal2'
      return 'aal1'
    },
    async listFactors() {
      if (mode === 'setup') return []
      if (mode === 'operator-help') return [{ id: 'phone-1', factorType: 'phone', status: 'verified' }]
      if (mode === 'challenge' || mode === 'denied' || mode === 'operations-denied' || mode === 'unavailable' || isStaffPreview(mode)) {
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
    'user-active',
    'user-suspended',
    'user-confirm',
    'user-success',
    'user-unchanged',
    'user-conflict',
    'user-action-error',
    'audit',
    'operations',
    'operations-unavailable',
    'operations-stale',
    'operations-unconfigured',
    'operations-incident',
  ].includes(mode)
}

function previewRoute(mode: string): AdminRoute | undefined {
  if (mode === 'users' || mode === 'users-error') return { name: 'users', query: 'ada', cursor: null }
  if (mode === 'users-empty') return { name: 'users', query: 'nobody', cursor: null }
  if (
    mode === 'user' ||
    mode === 'user-active' ||
    mode === 'user-suspended' ||
    mode === 'user-confirm' ||
    mode === 'user-success' ||
    mode === 'user-unchanged' ||
    mode === 'user-conflict' ||
    mode === 'user-action-error' ||
    mode === 'audit'
  ) {
    return { name: 'user', id: previewUserId }
  }
  if (mode === 'disputes' || mode === 'disputes-empty' || mode === 'disputes-error') {
    return { name: 'disputes', cursor: null }
  }
  if (mode === 'dispute') return { name: 'dispute', id: previewDisputeId }
  if (mode.startsWith('operations') && mode !== 'operations-denied') return { name: 'operations' }
  if (mode === 'accepted') return { name: 'home' }
  return undefined
}

function previewNotice(mode: string): string | null {
  if (mode === 'user-success') return 'The account is now suspended.'
  if (mode === 'user-unchanged') return 'This account is already suspended.'
  if (mode === 'user-conflict') return 'This account changed. Refresh it before trying again.'
  if (mode === 'user-action-error') return 'The result is unknown. Refresh the account before trying again.'
  return null
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
      const suspended = mode === 'user-suspended' || mode === 'user-success' || mode === 'user-unchanged'
      return {
        ok: true,
        data: {
          ...previewUserDetail,
          accountStatus: suspended ? 'SUSPENDED' : 'ACTIVE',
          statusAction: suspended ? 'restore' : 'suspend',
        },
      }
    },
    async setAccountStatus() {
      if (mode === 'user-conflict') return { ok: false, kind: 'conflict' }
      if (mode === 'user-action-error') return { ok: false, kind: 'uncertain' }
      if (mode === 'user-unchanged') return { ok: true, data: { outcome: 'unchanged', accountStatus: 'SUSPENDED' } }
      return { ok: true, data: { outcome: 'changed', accountStatus: 'SUSPENDED' } }
    },
    async accountActions() {
      if (mode !== 'audit' && mode !== 'user-success') return { ok: true, data: { items: [], nextCursor: null } }
      return {
        ok: true,
        data: {
          items: [
            {
              id: '55555555-5555-4555-8555-555555555555',
              action: 'account_suspended' as const,
              actorSubjectId: '66666666-6666-4666-8666-666666666666',
              targetAccountId: previewUserId,
              targetDisplayName: 'Ada Preview',
              previousStatus: 'ACTIVE',
              resultingStatus: 'SUSPENDED',
              reason: 'Synthetic review hold',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          nextCursor: null,
        },
      }
    },
    async disputes() {
      if (disputesFailed) return { ok: false, kind: 'unavailable' }
      if (disputesEmpty) return { ok: true, data: { items: [], nextCursor: null } }
      return { ok: true, data: { items: [previewDispute], nextCursor: null } }
    },
    async dispute() {
      return { ok: true, data: previewDispute }
    },
    async operations() {
      if (mode === 'operations-denied') return { ok: false, kind: 'denied' }
      return { ok: true, data: previewOperations(mode) }
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
