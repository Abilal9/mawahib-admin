export type StaffUserSummary = {
  id: string
  email: string
  username: string
  displayName: string
  accountType: string
  accountStatus: string
  createdAt: string
  deletedAt: string | null
}

export type StaffUserDetail = StaffUserSummary & {
  followersCount: number
  followingCount: number
  postsCount: number
  clientEngagementCount: number
  providerEngagementCount: number
  simulatedPaymentCount: number
  statusAction: 'suspend' | 'restore' | 'deleted' | 'ineligible'
}

export type StaffDisputePayment = {
  amount: string
  currency: string
  status: string
  simulated: boolean
}

export type StaffDispute = {
  id: string
  title: string
  status: 'disputed'
  updatedAt: string
  deletedAt: string | null
  clientDisplayName: string | null
  providerDisplayName: string | null
  disputeEventId: string | null
  disputeAt: string | null
  disputeNote: string | null
  payment: StaffDisputePayment | null
}

export type StaffReportSummary = {
  id: string
  targetType: 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  statusChangedAt: string | null
  hasDetails: boolean
  reportedUser: { id: string; displayName: string; accountStatus: string; deleted: boolean } | null
}

export type StaffReportDetail = {
  id: string
  targetType: 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'
  reason: string
  details: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  statusChangedAt: string | null
  reporter: { id: string; displayName: string; accountStatus: string; deleted: boolean } | null
  reportedUser: StaffReportSummary['reportedUser']
  target: Record<string, unknown>
  history: Array<{ id: string; action: string; actorLabel: string | null; note: string | null; createdAt: string }>
}

export type ReportStatusFilter = 'open' | 'resolved' | 'dismissed'
export type ReportTargetFilter = 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'

export type ReportListQuery = {
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  cursor: string | null
}

export type ReportTotals = {
  openReports: number
  totalReports: number
}

export type AdminPage<T> = {
  items: T[]
  nextCursor: string | null
}

export type StaffReportPage = AdminPage<StaffReportSummary> & {
  matchCount: number
}

export type StaffUserPage = AdminPage<StaffUserSummary> & {
  totalUsers: number
  matchCount: number
}

export type AccountActionRecord = {
  id: string
  action: 'account_suspended' | 'account_restored'
  actorSubjectId: string | null
  targetAccountId: string | null
  targetDisplayName: string | null
  previousStatus: string | null
  resultingStatus: string | null
  reason: string | null
  createdAt: string
}

export type AccountStatusChange = {
  outcome: 'changed' | 'unchanged' | 'observed'
  accountStatus: 'ACTIVE' | 'SUSPENDED'
}

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'denied' | 'expired' | 'unavailable' | 'not-found' | 'conflict' | 'ineligible' | 'uncertain' }

export type AdminRecords = {
  searchUsers(query: string, cursor: string | null): Promise<AdminResult<StaffUserPage>>
  user(id: string): Promise<AdminResult<StaffUserDetail>>
  setAccountStatus(
    id: string,
    input: { status: 'ACTIVE' | 'SUSPENDED'; expectedStatus: 'ACTIVE' | 'SUSPENDED'; reason: string },
  ): Promise<AdminResult<AccountStatusChange>>
  accountActions(targetAccountId: string): Promise<AdminResult<AdminPage<AccountActionRecord>>>
  disputes(cursor: string | null): Promise<AdminResult<AdminPage<StaffDispute>>>
  dispute(id: string): Promise<AdminResult<StaffDispute>>
  operations(): Promise<AdminResult<OperationsOverview>>
  reportSummary(): Promise<AdminResult<ReportTotals>>
  reports(query: ReportListQuery): Promise<AdminResult<StaffReportPage>>
  report(id: string): Promise<AdminResult<StaffReportDetail>>
  setReportStatus(
    id: string,
    input: { status: 'open' | 'resolved' | 'dismissed'; expectedStatus: 'open' | 'resolved' | 'dismissed'; note: string },
  ): Promise<AdminResult<{ id: string; status: string }>>
}

export type AdminRoute =
  | { name: 'home' }
  | { name: 'users'; query: string; cursor: string | null }
  | { name: 'user'; id: string }
  | { name: 'disputes'; cursor: string | null }
  | { name: 'dispute'; id: string }
  | { name: 'operations' }
  | { name: 'reports'; statuses: ReportListQuery['statuses']; targetTypes: ReportListQuery['targetTypes']; cursor: string | null }
  | { name: 'report'; id: string; returnTo: ReportListQuery }
  | { name: 'marketplace' }
  | { name: 'payments' }
  | { name: 'staff' }

export type OpsState = 'up' | 'down' | 'degraded' | 'paused' | 'unknown' | 'unavailable' | 'not_configured' | 'not_available'

export type OperationsCard = {
  id: 'railway' | 'database' | 'supabase_project' | 'supabase_backup' | 'uptime'
  title: string
  state: OpsState
  stale: boolean
  fetchedAt: string | null
  eventAt: string | null
  summary: string
  details: { label: string; value: string }[]
  incidents: { at: string | null; label: string }[]
  dashboardUrl: string | null
}

export type OperationsOverview = {
  generatedAt: string
  cards: OperationsCard[]
}
