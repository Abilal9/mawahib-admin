import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { AccountActionRecord, AdminRecords, AdminResult, AdminRoute, OperationsOverview, StaffDispute, StaffUserDetail, StaffUserSummary } from './adminTypes'
import { OPERATIONS_POLL_MS, OperationsView } from './OperationsView'
import { PortalFrame, type PortalSection } from '../portal/PortalFrame'

type PlaceholderSection = 'marketplace' | 'reports' | 'payments' | 'staff'

type View =
  | { name: 'loading' }
  | { name: 'overview'; overview: OperationsOverview | null; userTotal: number | null }
  | { name: 'users'; query: string; items: StaffUserSummary[]; nextCursor: string | null; totalUsers: number; matchCount: number }
  | { name: 'user'; user: StaffUserDetail }
  | { name: 'disputes'; items: StaffDispute[]; nextCursor: string | null }
  | { name: 'dispute'; dispute: StaffDispute }
  | { name: 'operations'; overview: OperationsOverview }
  | { name: 'placeholder'; section: PlaceholderSection }
  | { name: 'empty'; message: string }
  | { name: 'denied' }
  | { name: 'expired' }
  | { name: 'unavailable' }
  | { name: 'missing' }

export function AdminShell({
  records,
  initialRoute = { name: 'home' },
  onSignOut,
  onAccessDenied,
  initialNotice = null,
  startConfirming = false,
}: {
  records: AdminRecords
  initialRoute?: AdminRoute
  onSignOut: () => void
  onAccessDenied?: () => void
  initialNotice?: string | null
  startConfirming?: boolean
}) {
  const [route, setRoute] = useState<AdminRoute>(initialRoute)
  const [view, setView] = useState<View>({ name: 'loading' })
  const [query, setQuery] = useState(initialRoute.name === 'users' ? initialRoute.query : '')
  const [reload, setReload] = useState(0)
  const requestId = useRef(0)
  const searchId = useId()

  useEffect(() => {
    const id = ++requestId.current
    setView({ name: 'loading' })
    void load(records, route).then((next) => {
      if (id !== requestId.current) return
      if (next.name === 'denied' && onAccessDenied) {
        onAccessDenied()
        return
      }
      setView(next)
    })
    return () => {
      requestId.current += 1
    }
  }, [onAccessDenied, records, route, reload])

  useEffect(() => {
    if (route.name !== 'operations' && route.name !== 'home') return
    const timer = setInterval(() => {
      const id = ++requestId.current
      void load(records, route).then((next) => {
        if (id !== requestId.current) return
        if (next.name === 'denied' && onAccessDenied) {
          onAccessDenied()
          return
        }
        setView(next)
      })
    }, OPERATIONS_POLL_MS)
    return () => clearInterval(timer)
  }, [onAccessDenied, records, route])

  function open(next: AdminRoute) {
    setRoute(next)
  }

  function navigate(section: PortalSection) {
    open(navigateSection(section))
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    open({ name: 'users', query: query.trim(), cursor: null })
  }

  return (
    <PortalFrame
      current={sectionFor(route)}
      title={titleFor(route, view)}
      onNavigate={navigate}
      onSignOut={onSignOut}
      signOutLabel="Sign out"
      confirmSignOut
      showBack={route.name !== 'home'}
      onBack={() => open(backRoute(route))}
    >
      <SearchForm
        searchId={searchId}
        query={query}
        setQuery={setQuery}
        onSubmit={submitSearch}
        onClear={() => {
          setQuery('')
          open({ name: 'users', query: '', cursor: null })
        }}
        show={route.name === 'users'}
      />
      {view.name === 'overview' ? <Overview overview={view.overview} userTotal={view.userTotal} onOpen={open} onRefresh={() => setReload((value) => value + 1)} /> : null}
      {view.name === 'denied' ? <p role="alert">Staff access is not active for this account. Contact your administrator.</p> : null}
      {view.name === 'expired' ? <p role="alert">Your session has expired. Sign in again.</p> : null}
      {view.name === 'unavailable' ? <p role="alert">The staff service is temporarily unavailable. Try again.</p> : null}
      {view.name === 'missing' ? <p role="alert">That record is not available.</p> : null}
      {view.name === 'empty' ? <p>{view.message}</p> : null}
      {view.name === 'placeholder' ? <Placeholder section={view.section} /> : null}
      {view.name === 'users' ? (
        <div className="demo-list">
          <p>Total users: {view.totalUsers}</p>
          {view.query.trim() ? <p>Matching accounts: {view.matchCount}</p> : null}
          <p className="quiet-note">Pages are loaded separately. Accounts added or removed can change a later page.</p>
          {view.items.length === 0 ? <p>{view.query.trim() ? 'No accounts match that search.' : 'No product accounts are listed.'}</p> : null}
          {view.items.map((user) => (
            <article key={user.id} className="demo-row">
              <div>
                <p><strong>{user.displayName}</strong></p>
                <p>{user.username}</p>
                <p>{user.email}</p>
                <p>{user.accountType} · {user.accountStatus}{user.deletedAt ? ' · Deleted' : ''}</p>
              </div>
              <button type="button" className="text-action" onClick={() => open({ name: 'user', id: user.id })}>View account</button>
            </article>
          ))}
          {view.nextCursor ? <button type="button" onClick={() => open({ name: 'users', query: view.query, cursor: view.nextCursor })}>Next</button> : null}
        </div>
      ) : null}
      {view.name === 'user' ? (
        <UserDetail user={view.user} records={records} onAccessDenied={onAccessDenied} initialNotice={initialNotice} startConfirming={startConfirming} />
      ) : null}
      {view.name === 'disputes' ? (
        <div className="demo-list">
          {view.items.map((dispute) => (
            <article key={dispute.id} className="demo-row">
              <div>
                <p><strong>{dispute.title}</strong></p>
                <p>{dispute.clientDisplayName ?? 'Name unavailable'} and {dispute.providerDisplayName ?? 'Name unavailable'}</p>
                <p>{dispute.disputeNote ?? 'No dispute note is recorded.'}</p>
                <PaymentLine payment={dispute.payment} />
              </div>
              <button type="button" className="text-action" onClick={() => open({ name: 'dispute', id: dispute.id })}>View dispute</button>
            </article>
          ))}
          {view.nextCursor ? <button type="button" onClick={() => open({ name: 'disputes', cursor: view.nextCursor })}>Next</button> : null}
        </div>
      ) : null}
      {view.name === 'dispute' ? <DisputeDetail dispute={view.dispute} /> : null}
      {view.name === 'operations' ? <OperationsView overview={view.overview} embedded onRefresh={() => setReload((value) => value + 1)} /> : null}
    </PortalFrame>
  )
}

function navigateSection(section: PortalSection): AdminRoute {
  if (section === 'overview') return { name: 'home' }
  if (section === 'users') return { name: 'users', query: '', cursor: null }
  if (section === 'disputes') return { name: 'disputes', cursor: null }
  if (section === 'operations') return { name: 'operations' }
  return { name: section }
}

function sectionFor(route: AdminRoute): PortalSection {
  if (route.name === 'home') return 'overview'
  if (route.name === 'user') return 'users'
  if (route.name === 'dispute') return 'disputes'
  if (route.name === 'marketplace' || route.name === 'reports' || route.name === 'payments' || route.name === 'staff') return route.name
  return route.name
}

function titleFor(route: AdminRoute, view: View): string {
  if (view.name === 'loading') return 'Loading records'
  if (view.name === 'denied') return 'Staff access unavailable'
  if (view.name === 'expired') return 'Session expired'
  if (view.name === 'unavailable') return 'Staff service unavailable'
  if (view.name === 'missing') return 'Record unavailable'
  if (view.name === 'user') return view.user.displayName
  if (view.name === 'dispute') return view.dispute.title
  if (route.name === 'home') return 'Overview'
  if (route.name === 'users') return 'Users'
  if (route.name === 'disputes') return 'Disputes'
  if (route.name === 'operations') return 'Monitoring'
  if (route.name === 'marketplace') return 'Marketplace'
  if (route.name === 'reports') return 'Reports'
  if (route.name === 'payments') return 'Payments'
  return 'Staff'
}

function Overview({ overview, userTotal, onOpen, onRefresh }: { overview: OperationsOverview | null; userTotal: number | null; onOpen: (route: AdminRoute) => void; onRefresh: () => void }) {
  const monitoring = monitoringHeadline(overview)
  return (
    <>
      <p className="section-note">Total users counts application accounts that are not deleted, including suspended accounts. Other sections omit a total when one is not available.</p>
      <div className="demo-metrics">
        <button type="button" className="demo-metric" onClick={() => onOpen({ name: 'users', query: '', cursor: null })}>
          <span className="metric-title">Total users</span>
          <span className="metric-value">{userTotal === null ? 'Unavailable' : String(userTotal)}</span>
          <span className="metric-detail">Active and suspended accounts</span>
        </button>
        <button type="button" className="demo-metric" onClick={() => onOpen({ name: 'disputes', cursor: null })}>
          <span className="metric-title">Disputes</span>
          <span className="metric-value">View open disputes</span>
          <span className="metric-detail">Total not available</span>
        </button>
        <button type="button" className="demo-metric" onClick={() => onOpen({ name: 'operations' })}>
          <span className="metric-title">Monitoring</span>
          <span className="metric-value">{monitoring.value}</span>
          <span className="metric-detail">{monitoring.detail}</span>
        </button>
      </div>
      {overview ? <OperationsView overview={overview} embedded onRefresh={onRefresh} /> : <p>Monitoring readings are not available right now.</p>}
    </>
  )
}

function monitoringHeadline(overview: OperationsOverview | null): { value: string; detail: string } {
  if (!overview) return { value: 'Unavailable', detail: 'The monitoring summary did not load.' }
  const cards = overview.cards
  const count = (matches: (card: OperationsOverview['cards'][number]) => boolean) => cards.filter(matches).length
  const outages = count((card) => !card.stale && card.id === 'uptime' && card.state === 'down')
  const failedReadings = count((card) => !card.stale && card.state === 'down' && card.id !== 'uptime')
  const failed = count((card) => !card.stale && (card.state === 'unavailable' || card.state === 'unknown'))
  const stale = count((card) => card.stale)
  const missing = count((card) => !card.stale && card.state === 'not_configured')
  const unsupported = count((card) => !card.stale && card.state === 'not_available')
  const degraded = count((card) => !card.stale && (card.state === 'degraded' || card.state === 'paused'))
  const current = count((card) => !card.stale && card.state === 'up')
  if (outages > 0) {
    return {
      value: 'Outage reported',
      detail: 'The production monitor reports a service outage.',
    }
  }
  if (failedReadings > 0) {
    return {
      value: 'Needs attention',
      detail: `${failedReadings} ${failedReadings === 1 ? 'reading failed' : 'readings failed'}. That is not a service outage.`,
    }
  }
  if (failed > 0) {
    return {
      value: 'Check failed',
      detail: `${failed} ${failed === 1 ? 'provider check failed' : 'provider checks failed'}. A failed check is not an outage.`,
    }
  }
  if (stale > 0) {
    return {
      value: 'Stale readings',
      detail: `${stale} ${stale === 1 ? 'reading is' : 'readings are'} out of date.`,
    }
  }
  if (missing > 0 || unsupported > 0) {
    const parts = []
    if (missing > 0) parts.push(`${missing} not set up`)
    if (unsupported > 0) parts.push(`${unsupported} not available on the current plan`)
    if (current > 0) parts.push(`${current} current`)
    return { value: 'Setup incomplete', detail: `${parts.join(', ')}. A missing integration is not an outage.` }
  }
  if (degraded > 0) {
    return {
      value: 'Needs attention',
      detail: `${degraded} ${degraded === 1 ? 'reading is' : 'readings are'} degraded or paused.`,
    }
  }
  return { value: 'Readings current', detail: 'No reading in this summary is missing, stale, or down.' }
}

function Placeholder({ section }: { section: PlaceholderSection }) {
  const copy = {
    marketplace: 'Marketplace oversight is not connected. Jobs, services, applications, and engagements will appear here when that API exists.',
    reports: 'Report submission and moderation are the next milestone after this portal. No report queue is connected.',
    payments: 'Payment and invoice lists are not connected. A dispute can still show its own simulated payment when the dispute API includes one.',
    staff: 'Staff invitations and activation stay on operator commands. This screen does not invite, activate, or hold credentials.',
  }[section]
  return <p className="demo-panel">{copy}</p>
}

function SearchForm({
  searchId,
  query,
  setQuery,
  onSubmit,
  onClear,
  show,
}: {
  searchId: string
  query: string
  setQuery: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onClear: () => void
  show: boolean
}) {
  if (!show) return null
  return (
    <form className="demo-filters" onSubmit={onSubmit}>
      <label htmlFor={searchId}>Name, username, email, or account id</label>
      <input id={searchId} name="q" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="actions">
        <button type="submit">Search</button>
        {query.trim() ? (
          <button type="button" className="secondary" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </form>
  )
}

function UserDetail({
  user,
  records,
  onAccessDenied,
  initialNotice = null,
  startConfirming = false,
}: {
  user: StaffUserDetail
  records: AdminRecords
  onAccessDenied?: () => void
  initialNotice?: string | null
  startConfirming?: boolean
}) {
  const reasonId = useId()
  const [current, setCurrent] = useState(user)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(startConfirming)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [message, setMessage] = useState<string | null>(initialNotice)
  const [history, setHistory] = useState<AccountActionRecord[]>([])
  const alive = useRef(true)
  const desired: 'ACTIVE' | 'SUSPENDED' = current.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
  const actionLabel = desired === 'SUSPENDED' ? 'Suspend' : 'Restore'

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void records.accountActions(current.id).then((result) => {
      if (!active) return
      if (!result.ok && result.kind === 'denied') {
        onAccessDenied?.()
        return
      }
      if (result.ok) setHistory(result.data.items)
    })
    return () => {
      active = false
    }
  }, [current.id, message, onAccessDenied, records])

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length > 500) return
    busyRef.current = true
    setBusy(true)
    const result = await records.setAccountStatus(current.id, {
      status: desired,
      expectedStatus: current.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      reason: trimmed,
    })
    if (!alive.current) return
    busyRef.current = false
    setBusy(false)
    if (!result.ok && result.kind === 'denied') {
      onAccessDenied?.()
      return
    }
    if (!result.ok && result.kind === 'conflict') {
      setMessage('This account changed. Refresh it before trying again.')
      return
    }
    if (!result.ok && result.kind === 'uncertain') {
      setMessage('The result is unknown. Refresh the account before trying again.')
      return
    }
    if (!result.ok && result.kind === 'ineligible') {
      setMessage('This account cannot be changed by this action.')
      return
    }
    if (!result.ok && result.kind === 'not-found') {
      setMessage('That record is not available.')
      return
    }
    if (!result.ok) {
      setMessage('The staff service is temporarily unavailable. Try again.')
      return
    }
    setConfirming(false)
    setReason('')
    setMessage(accountStatusMessage(result.data))
    const refreshed = await records.user(current.id)
    if (!alive.current) return
    if (!refreshed.ok && refreshed.kind === 'denied') {
      onAccessDenied?.()
      return
    }
    if (refreshed.ok) setCurrent(refreshed.data)
  }

  return (
    <section className="demo-panel">
      <p>{current.username}</p>
      <p>{current.email}</p>
      <p>
        {current.accountType} · {current.accountStatus}
      </p>
      <p>Created {formatWhen(current.createdAt)}</p>
      <p>{current.deletedAt ? `Deleted ${formatWhen(current.deletedAt)}` : 'Not deleted'}</p>
      <p>
        {current.followersCount} followers · {current.followingCount} following · {current.postsCount} posts
      </p>
      <p>
        {current.clientEngagementCount} client engagements · {current.providerEngagementCount} provider engagements
      </p>
      <p>Simulated payments: {current.simulatedPaymentCount}</p>
      {current.statusAction === 'deleted' ? <p>This deleted account cannot be suspended or restored.</p> : null}
      {current.statusAction === 'ineligible' ? <p>This account cannot be changed by this action.</p> : null}
      {current.statusAction === 'suspend' || current.statusAction === 'restore' ? (
        confirming ? (
          <form onSubmit={(event) => void confirm(event)}>
            <p>
              {actionLabel} {current.displayName} ({current.username})?
            </p>
            <label htmlFor={reasonId}>Reason</label>
            <textarea id={reasonId} name="reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
            {message ? <p role="alert">{message}</p> : null}
            <div className="actions">
              <button type="submit" disabled={busy || reason.trim().length === 0}>
                {busy ? 'Saving' : `Confirm ${actionLabel.toLowerCase()}`}
              </button>
              <button type="button" className="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="actions">
            <button type="button" onClick={() => setConfirming(true)}>
              {actionLabel}
            </button>
          </div>
        )
      ) : null}
      {message && !confirming ? <p role="status">{message}</p> : null}
      <h2>Account actions</h2>
      {history.length === 0 ? <p>No account actions are recorded.</p> : null}
      <div className="records">
        {history.map((item) => (
          <article key={item.id} className="record">
            <p>{item.action === 'account_suspended' ? 'Suspended' : 'Restored'}</p>
            <p>{item.reason}</p>
            <p>{item.previousStatus} to {item.resultingStatus}</p>
            <p>{formatWhen(item.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function DisputeDetail({ dispute }: { dispute: StaffDispute }) {
  return (
    <section className="demo-panel">
      <p>Status: Disputed</p>
      <p>Client: {dispute.clientDisplayName ?? 'Name unavailable'}</p>
      <p>Provider: {dispute.providerDisplayName ?? 'Name unavailable'}</p>
      <p>{dispute.deletedAt ? `Engagement deleted ${formatWhen(dispute.deletedAt)}` : 'Engagement is not deleted'}</p>
      <p>{dispute.disputeNote ?? 'No dispute note is recorded.'}</p>
      {dispute.disputeAt ? <p>Dispute opened {formatWhen(dispute.disputeAt)}</p> : null}
      <PaymentLine payment={dispute.payment} />
    </section>
  )
}

function PaymentLine({ payment }: { payment: StaffDispute['payment'] }) {
  if (!payment) return <p>No payment is recorded.</p>
  return (
    <p>
      {payment.simulated ? 'Simulated' : 'Payment'} {payment.amount} {payment.currency} · {payment.status}
    </p>
  )
}

function accountStatusMessage(result: { outcome: 'changed' | 'unchanged' | 'observed'; accountStatus: string }) {
  const word = result.accountStatus === 'SUSPENDED' ? 'suspended' : 'active'
  if (result.outcome === 'observed') return `The account is currently ${word}.`
  if (result.outcome === 'unchanged') return `This account is already ${word}.`
  return `The account is now ${word}.`
}

function backRoute(route: AdminRoute): AdminRoute {
  if (route.name === 'user') return { name: 'users', query: '', cursor: null }
  if (route.name === 'dispute') return { name: 'disputes', cursor: null }
  return { name: 'home' }
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function load(records: AdminRecords, route: AdminRoute): Promise<View> {
  if (route.name === 'marketplace' || route.name === 'reports' || route.name === 'payments' || route.name === 'staff') {
    return { name: 'placeholder', section: route.name }
  }
  if (route.name === 'home') {
    const [operationsResult, usersResult] = await Promise.all([
      records.operations(),
      records.searchUsers('', null),
    ])
    if (!operationsResult.ok && (operationsResult.kind === 'denied' || operationsResult.kind === 'expired')) {
      return failure(operationsResult.kind)
    }
    if (!usersResult.ok && (usersResult.kind === 'denied' || usersResult.kind === 'expired')) {
      return failure(usersResult.kind)
    }
    return {
      name: 'overview',
      overview: operationsResult.ok ? operationsResult.data : null,
      userTotal: usersResult.ok ? usersResult.data.totalUsers : null,
    }
  }
  if (route.name === 'users') {
    const result = await records.searchUsers(route.query, route.cursor)
    if (!result.ok) return failure(result.kind)
    return {
      name: 'users',
      query: route.query,
      items: result.data.items,
      nextCursor: result.data.nextCursor,
      totalUsers: result.data.totalUsers,
      matchCount: result.data.matchCount,
    }
  }
  if (route.name === 'user') return fromOne(await records.user(route.id), (user) => ({ name: 'user', user }))
  if (route.name === 'disputes') {
    return fromPage(await records.disputes(route.cursor), 'No disputed work is open.', (page) => ({
      name: 'disputes',
      items: page.items,
      nextCursor: page.nextCursor,
    }))
  }
  if (route.name === 'operations') {
    return fromOne(await records.operations(), (overview) => ({ name: 'operations', overview }))
  }
  return fromOne(await records.dispute(route.id), (dispute) => ({ name: 'dispute', dispute }))
}

function fromPage<T>(
  result: AdminResult<{ items: T[]; nextCursor: string | null }>,
  empty: string,
  present: (page: { items: T[]; nextCursor: string | null }) => View,
): View {
  if (!result.ok) return failure(result.kind)
  if (result.data.items.length === 0) return { name: 'empty', message: empty }
  return present(result.data)
}

function fromOne<T>(result: AdminResult<T>, present: (value: T) => View): View {
  if (!result.ok) return failure(result.kind)
  return present(result.data)
}

function failure(kind: Exclude<AdminResult<unknown>, { ok: true }>['kind']): View {
  if (kind === 'denied') return { name: 'denied' }
  if (kind === 'expired') return { name: 'expired' }
  if (kind === 'not-found') return { name: 'missing' }
  return { name: 'unavailable' }
}
