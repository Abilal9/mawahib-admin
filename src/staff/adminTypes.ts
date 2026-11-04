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

export type AdminPage<T> = {
  items: T[]
  nextCursor: string | null
}

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'denied' | 'expired' | 'unavailable' | 'not-found' }

export type AdminRecords = {
  searchUsers(query: string, cursor: string | null): Promise<AdminResult<AdminPage<StaffUserSummary>>>
  user(id: string): Promise<AdminResult<StaffUserDetail>>
  disputes(cursor: string | null): Promise<AdminResult<AdminPage<StaffDispute>>>
  dispute(id: string): Promise<AdminResult<StaffDispute>>
}

export type AdminRoute =
  | { name: 'home' }
  | { name: 'users'; query: string; cursor: string | null }
  | { name: 'user'; id: string }
  | { name: 'disputes'; cursor: string | null }
  | { name: 'dispute'; id: string }
