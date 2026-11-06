import type { OperationsOverview } from '../staff/adminTypes'

/** Provisional preview records. The backend does not serve this catalog. */

export const PERIOD_LABEL = '29 Oct – 5 Nov 2026'
const PERIOD_START = '2026-10-29T00:00:00.000Z'

export type DemoUser = {
  id: string
  name: string
  email: string
  username: string
  accountType: 'talent' | 'business'
  accountStatus: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  posts: number
  engagements: number
  history: { id: string; action: string; at: string; reason: string }[]
}

export type DemoJob = {
  id: string
  title: string
  status: 'open' | 'closed'
  posterId: string
  postedAt: string
}

export type DemoService = {
  id: string
  title: string
  status: 'published' | 'hidden'
  ownerId: string
  updatedAt: string
}

export type DemoApplication = {
  id: string
  jobId: string
  applicantId: string
  status: 'pending' | 'accepted' | 'declined'
  sentAt: string
}

export type DemoEngagement = {
  id: string
  title: string
  status: 'in_progress' | 'disputed' | 'completed'
  clientId: string
  providerId: string
  jobId: string | null
  updatedAt: string
}

export type DemoReport = {
  id: string
  targetType: 'user' | 'post' | 'comment' | 'review' | 'job' | 'service'
  targetLabel: string
  reason: string
  status: 'open' | 'dismissed' | 'escalated' | 'hidden'
  reporterId: string
  assignee: string | null
  notes: { id: string; at: string; text: string }[]
  submittedAt: string
}

export type DemoDispute = {
  id: string
  title: string
  stage: 'open' | 'watching'
  engagementId: string
  assignee: string
  note: string
  history: { id: string; at: string; text: string }[]
}

export type DemoPayment = {
  id: string
  status: 'succeeded' | 'failed'
  amount: string
  currency: 'SAR'
  userId: string
  engagementId: string
  at: string
  invoiceId: string | null
}

export type DemoInvoice = {
  id: string
  number: string
  paymentId: string
  amount: string
  currency: 'SAR'
}

export type DemoStaff = {
  id: string
  name: string
  email: string
  role: 'Operator'
  status: 'active' | 'pending'
}

export const users: DemoUser[] = [
  { id: 'u-ada', name: 'Layla Al-Shehri', email: 'layla.alshehri@example.com', username: 'layla-alshehri', accountType: 'talent', accountStatus: 'ACTIVE', createdAt: '2026-01-04T00:00:00.000Z', posts: 6, engagements: 3, history: [] },
  { id: 'u-nour', name: 'Maha Al-Harbi', email: 'maha.alharbi@example.com', username: 'maha-alharbi', accountType: 'talent', accountStatus: 'ACTIVE', createdAt: '2026-02-11T00:00:00.000Z', posts: 4, engagements: 2, history: [] },
  { id: 'u-huda', name: 'Huda Al-Qahtani', email: 'huda.alqahtani@example.com', username: 'huda-alqahtani', accountType: 'business', accountStatus: 'ACTIVE', createdAt: '2026-03-02T00:00:00.000Z', posts: 1, engagements: 2, history: [] },
  { id: 'u-omar', name: 'Omar Al-Harbi', email: 'omar.alharbi@example.com', username: 'omar-alharbi', accountType: 'talent', accountStatus: 'SUSPENDED', createdAt: '2026-04-18T00:00:00.000Z', posts: 2, engagements: 1, history: [{ id: 'h1', action: 'Suspended', at: '2026-10-02T00:00:00.000Z', reason: 'Account review requested' }] },
  { id: 'u-lina', name: 'Lina Mansour', email: 'lina.mansour@example.com', username: 'lina-mansour', accountType: 'business', accountStatus: 'ACTIVE', createdAt: '2026-10-30T00:00:00.000Z', posts: 0, engagements: 1, history: [] },
  { id: 'u-yusuf', name: 'Yusuf Al-Ghamdi', email: 'yusuf.alghamdi@example.com', username: 'yusuf-alghamdi', accountType: 'talent', accountStatus: 'ACTIVE', createdAt: '2026-11-03T00:00:00.000Z', posts: 1, engagements: 0, history: [] },
]

export const jobs: DemoJob[] = [
  { id: 'j-poster', title: 'Poster design', status: 'open', posterId: 'u-huda', postedAt: '2026-10-12T00:00:00.000Z' },
  { id: 'j-copy', title: 'Catalog copy', status: 'open', posterId: 'u-lina', postedAt: '2026-10-20T00:00:00.000Z' },
  { id: 'j-photo', title: 'Product photos', status: 'open', posterId: 'u-huda', postedAt: '2026-11-01T00:00:00.000Z' },
  { id: 'j-old', title: 'Closed launch film', status: 'closed', posterId: 'u-lina', postedAt: '2026-08-01T00:00:00.000Z' },
]

export const services: DemoService[] = [
  { id: 's-brand', title: 'Brand portraits', status: 'published', ownerId: 'u-ada', updatedAt: '2026-10-08T00:00:00.000Z' },
  { id: 's-edit', title: 'Edit and color', status: 'published', ownerId: 'u-nour', updatedAt: '2026-10-15T00:00:00.000Z' },
  { id: 's-draft', title: 'Seasonal lookbook', status: 'hidden', ownerId: 'u-yusuf', updatedAt: '2026-11-02T00:00:00.000Z' },
]

export const applications: DemoApplication[] = [
  { id: 'a-1', jobId: 'j-poster', applicantId: 'u-ada', status: 'pending', sentAt: '2026-10-13T00:00:00.000Z' },
  { id: 'a-2', jobId: 'j-copy', applicantId: 'u-nour', status: 'accepted', sentAt: '2026-10-21T00:00:00.000Z' },
  { id: 'a-3', jobId: 'j-photo', applicantId: 'u-omar', status: 'declined', sentAt: '2026-11-02T00:00:00.000Z' },
]

export const engagements: DemoEngagement[] = [
  { id: 'e-poster', title: 'Poster design', status: 'disputed', clientId: 'u-huda', providerId: 'u-ada', jobId: 'j-poster', updatedAt: '2026-11-04T00:00:00.000Z' },
  { id: 'e-copy', title: 'Catalog copy', status: 'in_progress', clientId: 'u-lina', providerId: 'u-nour', jobId: 'j-copy', updatedAt: '2026-11-03T00:00:00.000Z' },
  { id: 'e-photo', title: 'Studio day', status: 'in_progress', clientId: 'u-huda', providerId: 'u-ada', jobId: null, updatedAt: '2026-10-28T00:00:00.000Z' },
  { id: 'e-done', title: 'Closed launch film', status: 'completed', clientId: 'u-lina', providerId: 'u-nour', jobId: 'j-old', updatedAt: '2026-09-01T00:00:00.000Z' },
]

export const reports: DemoReport[] = [
  { id: 'r-user', targetType: 'user', targetLabel: 'Omar Al-Harbi', reason: 'Profile photo may include a logo the member does not own', status: 'open', reporterId: 'u-huda', assignee: null, notes: [], submittedAt: '2026-11-01T00:00:00.000Z' },
  { id: 'r-post', targetType: 'post', targetLabel: 'Studio day post', reason: 'Caption includes a phone number', status: 'open', reporterId: 'u-lina', assignee: 'Unassigned', notes: [], submittedAt: '2026-11-02T00:00:00.000Z' },
  { id: 'r-job', targetType: 'job', targetLabel: 'Product photos', reason: 'Listing title matches another open job', status: 'open', reporterId: 'u-ada', assignee: null, notes: [], submittedAt: '2026-11-03T00:00:00.000Z' },
  { id: 'r-comment', targetType: 'comment', targetLabel: 'Comment on a portrait', reason: 'Comment does not relate to the work shown', status: 'dismissed', reporterId: 'u-nour', assignee: 'Sara Al-Otaibi', notes: [{ id: 'n1', at: '2026-10-19T00:00:00.000Z', text: 'Dismissed after the comment was reviewed.' }], submittedAt: '2026-10-18T00:00:00.000Z' },
  { id: 'r-review', targetType: 'review', targetLabel: 'Review of catalog copy', reason: 'Review does not describe the delivered work', status: 'escalated', reporterId: 'u-yusuf', assignee: 'Sara Al-Otaibi', notes: [], submittedAt: '2026-10-25T00:00:00.000Z' },
  { id: 'r-service', targetType: 'service', targetLabel: 'Seasonal lookbook', reason: 'Service description is incomplete', status: 'hidden', reporterId: 'u-huda', assignee: 'Sara Al-Otaibi', notes: [], submittedAt: '2026-11-02T00:00:00.000Z' },
]

export const disputes: DemoDispute[] = [
  {
    id: 'd-poster',
    title: 'Poster delivery',
    stage: 'open',
    engagementId: 'e-poster',
    assignee: 'Sara Al-Otaibi',
    note: 'Delivery files differ from the approved brief.',
    history: [{ id: 'dh1', at: '2026-11-04T00:00:00.000Z', text: 'Opened from the disputed engagement.' }],
  },
  {
    id: 'd-watch',
    title: 'Catalog check-in',
    stage: 'watching',
    engagementId: 'e-copy',
    assignee: 'Unassigned',
    note: 'Watching only. This is not a content report.',
    history: [{ id: 'dh2', at: '2026-11-01T00:00:00.000Z', text: 'Internal note: waiting on delivery.' }],
  },
]

export const payments: DemoPayment[] = [
  { id: 'p-1', status: 'succeeded', amount: '150.00', currency: 'SAR', userId: 'u-huda', engagementId: 'e-poster', at: '2026-10-14T00:00:00.000Z', invoiceId: 'i-1' },
  { id: 'p-2', status: 'succeeded', amount: '220.00', currency: 'SAR', userId: 'u-lina', engagementId: 'e-copy', at: '2026-10-22T00:00:00.000Z', invoiceId: 'i-2' },
  { id: 'p-3', status: 'failed', amount: '80.00', currency: 'SAR', userId: 'u-huda', engagementId: 'e-photo', at: '2026-11-02T00:00:00.000Z', invoiceId: null },
  { id: 'p-4', status: 'succeeded', amount: '400.00', currency: 'SAR', userId: 'u-lina', engagementId: 'e-done', at: '2026-08-20T00:00:00.000Z', invoiceId: 'i-4' },
]

export const invoices: DemoInvoice[] = [
  { id: 'i-1', number: 'SIM-1001', paymentId: 'p-1', amount: '150.00', currency: 'SAR' },
  { id: 'i-2', number: 'SIM-1002', paymentId: 'p-2', amount: '220.00', currency: 'SAR' },
  { id: 'i-4', number: 'SIM-1004', paymentId: 'p-4', amount: '400.00', currency: 'SAR' },
]

export const staff: DemoStaff[] = [
  { id: 'st-1', name: 'Sara Al-Otaibi', email: 'sara.alotaibi@example.com', role: 'Operator', status: 'active' },
  { id: 'st-2', name: 'Faisal Al-Dosari', email: 'faisal.aldosari@example.com', role: 'Operator', status: 'active' },
  { id: 'st-3', name: 'Nora Al-Mutairi', email: 'nora.almutairi@example.com', role: 'Operator', status: 'pending' },
]

export const audit = [
  { id: 'au-1', actor: 'Sara Al-Otaibi', action: 'Suspended', target: 'Omar Al-Harbi', at: '2026-10-02T00:00:00.000Z', reason: 'Account review requested' },
]

export function nameOf(id: string): string {
  return users.find((user) => user.id === id)?.name ?? 'Name unavailable'
}

export function inPeriod(iso: string): boolean {
  return iso >= PERIOD_START
}

export function overviewCounts(input: { users: DemoUser[]; reports: DemoReport[] }) {
  const talent = input.users.filter((user) => user.accountType === 'talent').length
  return {
    users: input.users.length,
    talent,
    business: input.users.length - talent,
    newUsers: input.users.filter((user) => inPeriod(user.createdAt)).length,
    openJobs: jobs.filter((job) => job.status === 'open').length,
    activeServices: services.filter((service) => service.status === 'published').length,
    ongoingEngagements: engagements.filter((item) => item.status === 'in_progress' || item.status === 'disputed').length,
    openReports: input.reports.filter((report) => report.status === 'open').length,
    openDisputes: disputes.filter((dispute) => dispute.stage === 'open').length,
    failedPayments: payments.filter((payment) => payment.status === 'failed').length,
  }
}

const fetched = '2026-11-05T09:00:00.000Z'
const generated = '2026-11-05T10:00:00.000Z'

export function operationsExample(example: 'normal' | 'stale' | 'unavailable' | 'unconfigured'): OperationsOverview {
  const base = {
    stale: false,
    fetchedAt: fetched,
    eventAt: '2026-11-05T08:30:00.000Z',
    incidents: [] as { at: string | null; label: string }[],
    details: [] as { label: string; value: string }[],
  }
  const railway =
    example === 'unavailable'
      ? { ...base, state: 'unavailable' as const, summary: 'The provider did not respond in time. This is not a confirmed outage.' }
      : {
          ...base,
          state: 'up' as const,
          summary:
            'Railway has a successful deployment in the recent list.',
          details: [
            { label: 'Serving deployment', value: 'SUCCESS' },
            { label: 'Release', value: 'abc1234' },
          ],
        }
  const database =
    example === 'stale'
      ? { ...base, state: 'up' as const, stale: true, fetchedAt: '2026-11-05T08:00:00.000Z', summary: 'The last confirmed check reached the database. A newer check did not.' }
      : { ...base, state: 'up' as const, summary: 'The API can reach the application database.' }
  const project = { ...base, state: 'up' as const, summary: 'Supabase reports the project as active.' }
  const backup =
    example === 'unconfigured'
      ? { ...base, state: 'not_configured' as const, fetchedAt: null, eventAt: null, summary: 'Backup status is not configured.' }
      : { ...base, state: 'up' as const, summary: 'A completed backup time was returned.' }
  const uptime =
    example === 'unconfigured'
      ? { ...base, state: 'not_configured' as const, fetchedAt: null, eventAt: null, summary: 'The production monitor is not configured.' }
      : { ...base, state: 'up' as const, eventAt: null, summary: 'The monitor last reported the address as up.', details: [{ label: 'Last check', value: 'Not exposed by the API' }] }
  return {
    generatedAt: generated,
    cards: [
      { ...railway, id: 'railway', title: 'API deployment', dashboardUrl: 'https://railway.com/dashboard' },
      { ...database, id: 'database', title: 'Database connectivity', dashboardUrl: 'https://supabase.com/dashboard', details: [{ label: 'Check', value: 'SELECT 1' }] },
      { ...project, id: 'supabase_project', title: 'Supabase project', dashboardUrl: 'https://supabase.com/dashboard' },
      { ...backup, id: 'supabase_backup', title: 'Database backup', dashboardUrl: 'https://supabase.com/dashboard' },
      { ...uptime, id: 'uptime', title: 'Production monitor', dashboardUrl: 'https://dashboard.uptimerobot.com/' },
    ],
  }
}
