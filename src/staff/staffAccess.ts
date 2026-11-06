import type { StaffAccessClient, StaffAccessResult } from './types'

export function createStaffAccessClient(apiBaseUrl: string, fetchImpl: typeof fetch = fetch): StaffAccessClient {
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/admin/session`

  return {
    async check(accessToken: string): Promise<StaffAccessResult> {
      let response: Response
      try {
        response = await fetchImpl(endpoint, {
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
      if (response.status === 403) {
        const code = await response
          .clone()
          .json()
          .then((body: { code?: unknown }) => body.code)
          .catch(() => null)
        if (code === 'STAFF_PENDING_ACTIVATION') return { ok: false, kind: 'pending' }
        return { ok: false, kind: 'denied' }
      }
      if (!response.ok) return { ok: false, kind: 'unavailable' }

      try {
        const body = (await response.json()) as { role?: unknown; membership?: unknown }
        if (body.role === 'operator' && body.membership === 'active') {
          return { ok: true, role: 'operator' }
        }
      } catch {
        return { ok: false, kind: 'unavailable' }
      }

      return { ok: false, kind: 'denied' }
    },
  }
}
