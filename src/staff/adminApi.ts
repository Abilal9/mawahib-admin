import type { AccountStatusChange, AdminRecords, AdminResult, OperationsOverview, ReportTotals, StaffUserDetail } from './adminTypes'

export function createAdminRecords(apiBaseUrl: string, readAccessToken: () => Promise<string | null>): AdminRecords {
  const base = apiBaseUrl.replace(/\/$/, '')

  async function send(path: string, init: RequestInit): Promise<Response> {
    const accessToken = await readAccessToken()
    if (!accessToken) throw new MissingToken()
    return fetch(`${base}${path}`, {
      ...init,
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    })
  }

  async function get<T>(path: string): Promise<AdminResult<T>> {
    try {
      const response = await send(path, { method: 'GET' })
      return classify<T>(response)
    } catch (error) {
      if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
      return { ok: false, kind: 'unavailable' }
    }
  }

  return {
    searchUsers(query, cursor) {
      const params = new URLSearchParams()
      const trimmed = query.trim()
      if (trimmed) params.set('q', trimmed)
      if (cursor) params.set('cursor', cursor)
      const suffix = params.size > 0 ? `?${params.toString()}` : ''
      return get(`/admin/users${suffix}`)
    },
    user(id) {
      return get(`/admin/users/${encodeURIComponent(id)}`)
    },
    async setAccountStatus(id, input) {
      try {
        const response = await send(`/admin/users/${encodeURIComponent(id)}/account-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return classify<AccountStatusChange>(response)
      } catch (error) {
        if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
        const current = await get<StaffUserDetail>(`/admin/users/${encodeURIComponent(id)}`)
        if (!current.ok && (current.kind === 'denied' || current.kind === 'expired')) return current
        if (current.ok && (current.data.accountStatus === 'ACTIVE' || current.data.accountStatus === 'SUSPENDED')) {
          return { ok: true, data: { outcome: 'observed', accountStatus: current.data.accountStatus } }
        }
        return { ok: false, kind: 'uncertain' }
      }
    },
    accountActions(targetAccountId) {
      const params = new URLSearchParams({ targetAccountId })
      return get(`/admin/account-actions?${params.toString()}`)
    },
    disputes(cursor) {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      const suffix = params.size > 0 ? `?${params.toString()}` : ''
      return get(`/admin/disputes${suffix}`)
    },
    dispute(id) {
      return get(`/admin/disputes/${encodeURIComponent(id)}`)
    },
    operations() {
      return get<OperationsOverview>('/admin/operations')
    },
    reportSummary() {
      return get<ReportTotals>('/admin/reports/summary')
    },
    reports(query) {
      const params = new URLSearchParams()
      for (const status of query.statuses) params.append('status', status)
      for (const targetType of query.targetTypes) params.append('targetType', targetType)
      if (query.exactTarget) {
        params.set('exactTargetType', query.exactTarget.targetType)
        params.set('exactTargetId', query.exactTarget.targetId)
      }
      if (query.cursor) params.set('cursor', query.cursor)
      const suffix = params.size > 0 ? `?${params.toString()}` : ''
      return get(`/admin/reports${suffix}`)
    },
    report(id) {
      return get(`/admin/reports/${encodeURIComponent(id)}`)
    },
    async setReportStatus(id, input) {
      try {
        const response = await send(`/admin/reports/${encodeURIComponent(id)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return classify(response)
      } catch (error) {
        if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
        return { ok: false, kind: 'uncertain' }
      }
    },
    async setContentVisibility(kind, id, input) {
      const path = kind === 'post'
        ? `/admin/posts/${encodeURIComponent(id)}/moderation`
        : `/admin/post-comments/${encodeURIComponent(id)}/moderation`
      try {
        const response = await send(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return classify(response)
      } catch (error) {
        if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
        return { ok: false, kind: 'uncertain' }
      }
    },
  }
}

class MissingToken extends Error {}

async function classify<T>(response: Response): Promise<AdminResult<T>> {
  if (response.status === 401) return { ok: false, kind: 'expired' }
  if (response.status === 403) {
    try {
      const body = (await response.json()) as { code?: unknown }
      if (body.code === 'ACCOUNT_STATUS_INELIGIBLE') return { ok: false, kind: 'ineligible' }
    } catch {
      return { ok: false, kind: 'denied' }
    }
    return { ok: false, kind: 'denied' }
  }
  if (response.status === 404) return { ok: false, kind: 'not-found' }
  if (response.status === 409) return { ok: false, kind: 'conflict' }
  if (!response.ok) return { ok: false, kind: 'unavailable' }
  try {
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, kind: 'unavailable' }
  }
}
