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

export type DisputeCaseStatus = 'open' | 'in_review' | 'closed'
export type DisputeCaseOutcome = 'parties_resolved' | 'no_staff_action' | 'payment_follow_up' | 'invalid_or_duplicate' | 'other' | 'returned_for_client_review' | 'further_work_agreed'
export type DisputeResolutionAction = 'return_to_client_review' | 'further_work' | 'follow_up'
export type DisputeResolutionOption = { available: boolean; reason: string | null }
export type DisputeCaseQuery = {
  q: string
  statuses: DisputeCaseStatus[]
  assignment: Array<'unassigned' | 'mine' | 'others'>
  engagementState: Array<'disputed' | 'not_disputed'>
  cursor: string | null
}
export const EMPTY_DISPUTES: DisputeCaseQuery = {
  q: '',
  statuses: [],
  assignment: [],
  engagementState: [],
  cursor: null,
}
export type DisputeParty = { id: string; displayName: string; accountStatus: string; deleted: boolean } | null
export type DisputeAssignee = { staffMemberId: string; label: string; membershipStatus?: string; isSelf: boolean; conflicted?: boolean }
export type DisputeCaseSummary = { openCases: number; disputedEngagements: number; totalCases: number }
export type DisputeCaseListItem = {
  id: string
  status: DisputeCaseStatus
  openedAt: string
  engagement: { id: string; title: string; status: string; deleted: boolean }
  client: DisputeParty
  provider: DisputeParty
  assignee: DisputeAssignee | null
  engagementStillDisputed: boolean
  reason: string | null
}
export type DisputeCaseDetail = {
  case: {
    id: string
    status: DisputeCaseStatus
    revision: number
    openedAt: string
    closedOutcome: DisputeCaseOutcome | null
    closedNote: string | null
    engagementStillDisputed: boolean
  }
  assignment: { assignee: (DisputeAssignee & { membershipStatus: string }) | null }
  engagement: { id: string; title: string; status: string; source: string; deleted: boolean }
  businessDisputeEnded: {
    kind: 'staff_resolution' | 'participant' | 'unknown'
    actorLabel: string | null
    by: 'client' | 'provider' | null
    toStatus: string
    at: string
    closedThisCase: boolean
  } | null
  client: DisputeParty
  provider: DisputeParty
  related: {
    job: { id: string; title: string; status: string } | null
    service: { id: string; title: string; status: string } | null
    application: { id: string; status: string } | null
  }
  dispute: { reason: string | null; openedAt: string; openedBy: 'client' | 'provider' | 'other' | null }
  engagementHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; at: string; by: string; note: string | null }>
  payments: Array<{
    id: string
    amount: string
    currency: string
    status: string
    simulated: boolean
    invoice: { id: string; invoiceNumber: string; status: string; total: string; currency: string; issuedAt: string | null; simulated: boolean; documentAvailable: boolean } | null
  }>
  resolutions?: {
    return_to_client_review: DisputeResolutionOption
    further_work: DisputeResolutionOption
    follow_up: DisputeResolutionOption
  }
  notes: Array<{ id: string; kind?: 'note' | 'follow_up'; body: string; author: { staffMemberId: string; label: string }; createdAt: string }>
  history: Array<{ id: string; action: string; actor: { label: string }; reason: string; createdAt: string; previousStatus: string; resultingStatus: string; engagementStatusAtAction?: string | null; engagementResultingStatus?: string | null }>
  viewer: { canAct: boolean; blockedReason: 'linked_participant' | null; allowedActions: string[] }
}
export type DisputeStatusInput = {
  action: 'start_review' | 'close' | 'reopen'
  expectedRevision: number
  note: string
  outcome?: DisputeCaseOutcome
  idempotencyKey: string
}
export type DisputeAssignmentInput = {
  assigneeStaffMemberId: string | null
  expectedRevision: number
  note: string
  idempotencyKey: string
}
export type DisputeMutation = {
  outcome: 'changed' | 'replayed'
  case: { id: string; status: DisputeCaseStatus; revision: number; closedOutcome?: DisputeCaseOutcome | null }
  engagement?: { previousStatus: string; status: string }
  paymentsChanged?: boolean
}
export type DisputeResolutionInput = {
  action: DisputeResolutionAction
  expectedRevision: number
  expectedEngagementStatus: 'disputed'
  note: string
  idempotencyKey: string
}

export type StaffReportSummary = {
  id: string
  targetType: 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  statusChangedAt: string | null
  hasDetails: boolean
  targetId: string
  targetCounts: TargetReportCounts | null
  reportedUser: { id: string; displayName: string; accountStatus: string; deleted: boolean } | null
}

export type StaffReportDetail = {
  id: string
  targetType: 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'
  targetId: string
  reason: string
  details: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  statusChangedAt: string | null
  reporter: { id: string; displayName: string; accountStatus: string; deleted: boolean } | null
  reportedUser: StaffReportSummary['reportedUser']
  targetCounts: TargetReportCounts | null
  target: Record<string, unknown>
  contentModeration: {
    kind: 'post' | 'comment' | 'review' | 'job' | 'service'
    targetId: string
    postId?: string
    hidden: boolean
    hiddenAt: string | null
    version: number
    deleted: boolean
    history: Array<{ id: string; action: string; actorLabel: string | null; reason: string | null; createdAt: string }>
    rating?: number
    body?: string
    direction?: 'client_to_provider' | 'provider_to_client'
    author?: { id: string; displayName: string }
    reviewedPerson?: { id: string; displayName: string }
    engagement?: { id: string; title: string; deleted: boolean }
    service?: { id: string; title: string } | null
    publicEligible?: { count: number; average: number | null }
    hiddenReviewCount?: number
    title?: string
    businessStatus?: string
    owner?: { id: string; displayName: string; accountStatus: string; deleted: boolean }
  } | null
  history: Array<{ id: string; action: string; actorLabel: string | null; note: string | null; createdAt: string }>
}

export type ReportStatusFilter = 'open' | 'resolved' | 'dismissed'
export type ReportTargetFilter = 'post_comment' | 'work_request' | 'user' | 'post' | 'engagement_review' | 'job_listing' | 'service_offering'

export type TargetReportCounts = {
  openReportCount: number
  totalReportCount: number
  uniqueReporterCount: number
}

export type ReportListQuery = {
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  exactTarget: { targetType: ReportTargetFilter; targetId: string } | null
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
  | { ok: false; kind: 'denied' | 'expired' | 'unavailable' | 'not-found' | 'conflict' | 'invalid' | 'ineligible' | 'uncertain' }

export type AdminRecords = {
  searchUsers(query: string, cursor: string | null): Promise<AdminResult<StaffUserPage>>
  user(id: string): Promise<AdminResult<StaffUserDetail>>
  setAccountStatus(
    id: string,
    input: { status: 'ACTIVE' | 'SUSPENDED'; expectedStatus: 'ACTIVE' | 'SUSPENDED'; reason: string },
  ): Promise<AdminResult<AccountStatusChange>>
  accountActions(targetAccountId: string): Promise<AdminResult<AdminPage<AccountActionRecord>>>
  disputeCaseSummary(): Promise<AdminResult<DisputeCaseSummary>>
  disputeCases(query: DisputeCaseQuery): Promise<AdminResult<AdminPage<DisputeCaseListItem> & { total: number; matchCount: number }>>
  disputeCase(id: string): Promise<AdminResult<DisputeCaseDetail>>
  disputeCaseAssignees(id: string): Promise<AdminResult<{ items: DisputeAssignee[] }>>
  setDisputeCaseStatus(id: string, input: DisputeStatusInput): Promise<AdminResult<DisputeMutation>>
  setDisputeCaseAssignment(id: string, input: DisputeAssignmentInput): Promise<AdminResult<DisputeMutation>>
  addDisputeCaseNote(id: string, input: { body: string; idempotencyKey: string }): Promise<AdminResult<{ outcome: 'changed' | 'replayed'; note: { id: string } }>>
  resolveDisputeCase(id: string, input: DisputeResolutionInput): Promise<AdminResult<DisputeMutation>>
  operations(): Promise<AdminResult<OperationsOverview>>
  reportSummary(): Promise<AdminResult<ReportTotals>>
  reports(query: ReportListQuery): Promise<AdminResult<StaffReportPage>>
  report(id: string): Promise<AdminResult<StaffReportDetail>>
  setReportStatus(
    id: string,
    input: { status: 'open' | 'resolved' | 'dismissed'; expectedStatus: 'open' | 'resolved' | 'dismissed'; note: string },
  ): Promise<AdminResult<{ id: string; status: string }>>
  setContentVisibility(
    kind: 'post' | 'comment' | 'review' | 'job' | 'service',
    id: string,
    input: { hidden: boolean; expectedVersion: number; reason: string },
  ): Promise<AdminResult<{ outcome: 'changed' | 'unchanged'; hidden: boolean; hiddenAt: string | null; version: number }>>
  marketplaceSummary(): Promise<AdminResult<{ totalJobs: number; totalEngagements: number }>>
  jobs(query: MarketplaceQuery): Promise<AdminResult<MarketplacePage<StaffJobListItem>>>
  job(id: string): Promise<AdminResult<StaffJobDetail>>
  services(query: MarketplaceQuery): Promise<AdminResult<MarketplacePage<StaffServiceListItem>>>
  service(id: string): Promise<AdminResult<StaffServiceDetail>>
  applications(query: MarketplaceQuery): Promise<AdminResult<MarketplacePage<StaffApplicationListItem>>>
  application(id: string): Promise<AdminResult<StaffApplicationDetail>>
  engagements(query: MarketplaceQuery): Promise<AdminResult<MarketplacePage<StaffEngagementListItem>>>
  engagement(id: string): Promise<AdminResult<StaffEngagementDetail>>
  invoiceDocument(id: string): Promise<AdminResult<{ url: string; originalFileName: string; mimeType: string }>>
}

export type AdminRoute =
  | { name: 'home' }
  | { name: 'users'; query: string; cursor: string | null }
  | { name: 'user'; id: string }
  | ({ name: 'disputes' } & DisputeCaseQuery)
  | { name: 'dispute'; id: string; returnTo: DisputeCaseQuery }
  | { name: 'operations' }
  | ({ name: 'reports' } & ReportListQuery)
  | { name: 'report'; id: string; returnTo: ReportListQuery }
  | ({ name: 'marketplace' } & MarketplaceQuery)
  | { name: 'marketplace-detail'; tab: MarketplaceTab; id: string; returnTo: MarketplaceQuery }
  | { name: 'payments' }
  | { name: 'staff' }

export type MarketplaceTab = 'jobs' | 'services' | 'applications' | 'engagements'

export type MarketplaceQuery = {
  tab: MarketplaceTab
  q: string
  statuses: string[]
  employmentTypes: string[]
  sources: string[]
  includeDeleted: boolean
  listingId: string | null
  serviceOfferingId: string | null
  cursor: string | null
}

export const EMPTY_MARKETPLACE: MarketplaceQuery = {
  tab: 'jobs',
  q: '',
  statuses: [],
  employmentTypes: [],
  sources: [],
  includeDeleted: false,
  listingId: null,
  serviceOfferingId: null,
  cursor: null,
}

export type StaffParty = { id: string; displayName: string; deleted: boolean }

export type StaffJobListItem = {
  id: string
  title: string
  companyName: string | null
  status: string
  employmentType: string
  poster: StaffParty | null
  applicationCount: number
  postedAt: string | null
  createdAt: string
  deletedAt: string | null
}

export type StaffJobDetail = StaffJobListItem & {
  location: string
  updatedAt: string
  category: { id: string; nameEn: string } | null
  customCategory: string | null
  pricing: { type: string; currency: string; fixedAmount: string | null; minAmount: string | null; maxAmount: string | null }
  engagementCount: number
  engagements: StaffEngagementInvoices[]
}

export type StaffServiceListItem = {
  id: string
  title: string
  status: string
  owner: StaffParty | null
  currency: string
  fromPrice: string | null
  packageCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type StaffServiceDetail = StaffServiceListItem & {
  category: { id: string; nameEn: string } | null
  customCategory: string | null
  packages: Array<{ id: string; tier: string; price: string; currency: string; deliveryLabel: string }>
  engagementCount: number
}

export type StaffApplicationListItem = {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  listing: { id: string; title: string; status: string; deleted: boolean } | null
  applicant: StaffParty | null
  poster: StaffParty | null
  engagementId: string | null
}

export type StaffApplicationDetail = StaffApplicationListItem & {
  engagement: { id: string; status: string; deleted: boolean } | null
}

export type StaffEngagementListItem = {
  id: string
  title: string
  status: string
  source: string
  client: StaffParty | null
  provider: StaffParty | null
  listingId: string | null
  applicationId: string | null
  serviceOfferingId: string | null
  payment: StaffDisputePayment | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  deletedAt: string | null
}

export type StaffPaymentAttempt = {
  id: string
  amount: string
  currency: string
  status: string
  simulated: boolean
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    issuedAt: string | null
    amount: string
    currency: string
    status: string
    simulated: boolean
    hasDocument: boolean
  } | null
}

export type StaffEngagementInvoices = {
  id: string
  title: string
  status: string
  deleted: boolean
  client: StaffParty | null
  provider: StaffParty | null
  payments: StaffPaymentAttempt[]
}

export type StaffEngagementDetail = StaffEngagementListItem & {
  dueAt: string | null
  reviewWindowClosesAt: string | null
  listing: { id: string; title: string; deleted: boolean } | null
  serviceOffering: { id: string; title: string; deleted: boolean } | null
  disputeCaseId: string | null
  payments: StaffPaymentAttempt[]
}

export type MarketplacePage<T> = { items: T[]; nextCursor: string | null; total: number; matchCount: number }

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
