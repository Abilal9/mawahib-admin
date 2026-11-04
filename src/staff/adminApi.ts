import type { AdminRecords, AdminResult } from './adminTypes'

export function createAdminRecords(apiBaseUrl: string, readAccessToken: () => Promise<string | null>): AdminRecords {
  const base = apiBaseUrl.replace(/\/$/, '')

  async function get<T>(path: string): Promise<AdminResult<T>> {
    const accessToken = await readAccessToken()
    if (!accessToken) return { ok: false, kind: 'expired' }
    let response: Response
    try {
      response = await fetch(`${base}${path}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch {
      return { ok: false, kind: 'unavailable' }
    }
    if (response.status === 401) return { ok: false, kind: 'expired' }
    if (response.status === 403) return { ok: false, kind: 'denied' }
    if (response.status === 404) return { ok: false, kind: 'not-found' }
    if (!response.ok) return { ok: false, kind: 'unavailable' }
    try {
      return { ok: true, data: (await response.json()) as T }
    } catch {
      return { ok: false, kind: 'unavailable' }
    }
  }

  return {
    searchUsers(query, cursor) {
      const params = new URLSearchParams({ q: query })
      if (cursor) params.set('cursor', cursor)
      return get(`/admin/users?${params.toString()}`)
    },
    user(id) {
      return get(`/admin/users/${encodeURIComponent(id)}`)
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
  }
}
