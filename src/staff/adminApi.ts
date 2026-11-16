import type { AccountStatusChange, AdminRecords, AdminResult, DeletionConfirmResult, DeletionStatus, DisputeAssignmentInput, DisputeMutation, DisputeResolutionInput, DisputeStatusInput, InvoiceRetryResult, MarketplaceQuery, OperationsOverview, ReportTotals, StaffUserDetail } from './adminTypes'

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

  async function post<T>(path: string, body: unknown): Promise<AdminResult<T>> {
    try {
      const response = await send(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return classify<T>(response)
    } catch (error) {
      if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
      return { ok: false, kind: 'uncertain' }
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
    deletionStatus(id) {
      return get<DeletionStatus>(`/admin/users/${encodeURIComponent(id)}/deletion`)
    },
    async confirmDeletion(id, input): Promise<DeletionConfirmResult> {
      try {
        const response = await send(`/admin/users/${encodeURIComponent(id)}/deletion/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const body = await response.json().catch(() => null) as {
          outcome?: 'closed' | 'replayed'
          status?: 'processing'
          code?: string
          message?: string
          blockers?: Array<{ engagementTitle?: string; explanation?: string }>
        } | null
        if (response.ok && body?.status === 'processing') {
          return { ok: true, data: { outcome: body.outcome === 'replayed' ? 'replayed' : 'closed', status: 'processing' } }
        }
        if (response.status === 401 || response.status === 403) return { ok: false, kind: 'denied', message: body?.message }
        if (response.status === 409) {
          return { ok: false, kind: 'conflict', code: body?.code, message: body?.message, blockers: body?.blockers }
        }
        return { ok: false, kind: 'unavailable', message: body?.message }
      } catch (error) {
        if (error instanceof MissingToken) return { ok: false, kind: 'expired' }
        return { ok: false, kind: 'unavailable' }
      }
    },
    retryDeletionCleanup(id, taskId) {
      return post(`/admin/users/${encodeURIComponent(id)}/deletion/cleanup/${encodeURIComponent(taskId)}/retry`, {})
    },
    accountActions(targetAccountId) {
      const params = new URLSearchParams({ targetAccountId })
      return get(`/admin/account-actions?${params.toString()}`)
    },
    disputeCaseSummary() {
      return get('/admin/dispute-cases/summary')
    },
    disputeCases(query) {
      const params = new URLSearchParams()
      const q = query.q.trim()
      if (q) params.set('q', q)
      if (query.statuses.length > 0) params.set('status', query.statuses.join(','))
      if (query.assignment.length > 0) params.set('assignment', query.assignment.join(','))
      if (query.engagementState.length > 0) params.set('engagementState', query.engagementState.join(','))
      if (query.cursor) params.set('cursor', query.cursor)
      const suffix = params.size > 0 ? `?${params.toString()}` : ''
      return get(`/admin/dispute-cases${suffix}`)
    },
    disputeCase(id) {
      return get(`/admin/dispute-cases/${encodeURIComponent(id)}`)
    },
    disputeCaseAssignees(id) {
      return get(`/admin/dispute-cases/${encodeURIComponent(id)}/assignees`)
    },
    setDisputeCaseStatus(id, input: DisputeStatusInput) {
      return post<DisputeMutation>(`/admin/dispute-cases/${encodeURIComponent(id)}/status`, input)
    },
    setDisputeCaseAssignment(id, input: DisputeAssignmentInput) {
      return post<DisputeMutation>(`/admin/dispute-cases/${encodeURIComponent(id)}/assignment`, input)
    },
    addDisputeCaseNote(id, input) {
      return post(`/admin/dispute-cases/${encodeURIComponent(id)}/notes`, input)
    },
    resolveDisputeCase(id, input: DisputeResolutionInput) {
      return post<DisputeMutation>(`/admin/dispute-cases/${encodeURIComponent(id)}/resolution`, input)
    },
    closeWork(id, input: {
      reason: string
      expectedRevision: number
      expectedEngagementStatus: 'in_progress' | 'delivered' | 'disputed'
      confirmedTitle: string
      idempotencyKey: string
      initiation: { category: 'report'; reportId: string } | { category: 'support_request'; reference: string } | { category: 'staff_observation' }
      financialFollowUpRequired: boolean
    }) {
      return post<DisputeMutation>(`/admin/dispute-cases/${encodeURIComponent(id)}/close-work`, input)
    },
    closeEngagementWork(id, input) {
      return post<{ outcome: 'changed' | 'replayed'; closureId: string }>(`/admin/engagements/${encodeURIComponent(id)}/close-work`, input)
    },
    recordFinancialFollowUp(id, input) {
      return post<{ outcome: 'changed' | 'replayed'; closureId: string }>(`/admin/engagements/${encodeURIComponent(id)}/financial-follow-up`, input)
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
        : kind === 'comment'
          ? `/admin/post-comments/${encodeURIComponent(id)}/moderation`
          : kind === 'review'
            ? `/admin/engagement-reviews/${encodeURIComponent(id)}/moderation`
            : kind === 'job'
              ? `/admin/job-listings/${encodeURIComponent(id)}/moderation`
              : `/admin/service-offerings/${encodeURIComponent(id)}/moderation`
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
    marketplaceSummary() {
      return get<{ totalJobs: number; totalEngagements: number }>('/admin/marketplace/summary')
    },
    jobs(query) {
      return marketQuery(get, 'jobs', query)
    },
    job(id) {
      return get(`/admin/jobs/${encodeURIComponent(id)}`)
    },
    services(query) {
      return marketQuery(get, 'services', query)
    },
    service(id) {
      return get(`/admin/services/${encodeURIComponent(id)}`)
    },
    applications(query) {
      return marketQuery(get, 'applications', query)
    },
    application(id) {
      return get(`/admin/applications/${encodeURIComponent(id)}`)
    },
    engagements(query) {
      return marketQuery(get, 'engagements', query)
    },
    engagement(id) {
      return get(`/admin/engagements/${encodeURIComponent(id)}`)
    },
    invoiceDocument(id) {
      return get<{ url: string; originalFileName: string; mimeType: string }>(`/admin/invoices/${encodeURIComponent(id)}/document`)
    },
    async retryInvoice(id) {
      try {
        const response = await send(`/admin/invoices/${encodeURIComponent(id)}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
        if (response.ok) {
          const invoice = (await response.json()) as Extract<InvoiceRetryResult, { ok: true }>['invoice']
          return { ok: true as const, invoice }
        }
        let message = 'The invoice could not be retried.'
        try {
          const body = (await response.json()) as { message?: unknown }
          if (typeof body.message === 'string' && body.message.trim()) message = body.message
        } catch {
          message = 'The invoice could not be retried.'
        }
        return { ok: false as const, message }
      } catch (error) {
        if (error instanceof MissingToken) return { ok: false as const, message: 'Sign in again to retry this invoice.' }
        return { ok: false as const, message: 'The invoice could not be retried. Refresh the page before trying again.' }
      }
    },
  }
}

class MissingToken extends Error {}

function marketQuery<T>(
  get: <TResult>(path: string) => Promise<AdminResult<TResult>>,
  kind: 'jobs' | 'services' | 'applications' | 'engagements',
  query: MarketplaceQuery,
): Promise<AdminResult<T>> {
  const params = new URLSearchParams()
  const q = query.q.trim()
  if (q) params.set('q', q)
  if (query.statuses.length > 0) params.set('status', query.statuses.join(','))
  if (kind === 'jobs' && query.employmentTypes.length > 0) params.set('employmentType', query.employmentTypes.join(','))
  if (kind === 'engagements' && query.sources.length > 0) params.set('source', query.sources.join(','))
  if (query.includeDeleted) params.set('includeDeleted', 'true')
  if ((kind === 'applications' || kind === 'engagements') && query.listingId) params.set('listingId', query.listingId)
  if (kind === 'engagements' && query.serviceOfferingId) params.set('serviceOfferingId', query.serviceOfferingId)
  if (query.cursor) params.set('cursor', query.cursor)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return get<T>(`/admin/${kind}${suffix}`)
}

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
  if (response.status === 400) return { ok: false, kind: 'invalid' }
  if (response.status === 404) return { ok: false, kind: 'not-found' }
  if (response.status === 409) return { ok: false, kind: 'conflict' }
  if (!response.ok) return { ok: false, kind: 'unavailable' }
  try {
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, kind: 'unavailable' }
  }
}
