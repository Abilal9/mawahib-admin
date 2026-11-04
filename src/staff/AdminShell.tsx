import { useEffect, useId, useState, type FormEvent } from 'react'
import type { AdminRecords, AdminResult, AdminRoute, StaffDispute, StaffUserDetail, StaffUserSummary } from './adminTypes'

type View =
  | { name: 'loading' }
  | { name: 'home' }
  | { name: 'users'; query: string; items: StaffUserSummary[]; nextCursor: string | null }
  | { name: 'user'; user: StaffUserDetail }
  | { name: 'disputes'; items: StaffDispute[]; nextCursor: string | null }
  | { name: 'dispute'; dispute: StaffDispute }
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
}: {
  records: AdminRecords
  initialRoute?: AdminRoute
  onSignOut: () => void
  onAccessDenied?: () => void
}) {
  const [route, setRoute] = useState<AdminRoute>(initialRoute)
  const [view, setView] = useState<View>({ name: 'loading' })
  const [query, setQuery] = useState(initialRoute.name === 'users' ? initialRoute.query : '')
  const searchId = useId()

  useEffect(() => {
    let current = true
    setView({ name: 'loading' })
    void load(records, route).then((next) => {
      if (!current) return
      if (next.name === 'denied' && onAccessDenied) {
        onAccessDenied()
        return
      }
      setView(next)
    })
    return () => {
      current = false
    }
  }, [onAccessDenied, records, route])

  function open(next: AdminRoute) {
    setRoute(next)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    open({ name: 'users', query: query.trim(), cursor: null })
  }

  return (
    <>
      <nav className="nav" aria-label="Staff">
        <button type="button" onClick={() => open({ name: 'users', query: '', cursor: null })}>
          Users
        </button>
        <button type="button" onClick={() => open({ name: 'disputes', cursor: null })}>
          Disputes
        </button>
        <button type="button" className="secondary" onClick={onSignOut}>
          Sign out
        </button>
      </nav>
      {route.name !== 'home' ? (
        <button type="button" className="secondary" onClick={() => open(backRoute(route))}>
          Back
        </button>
      ) : null}
      <SearchForm
        searchId={searchId}
        query={query}
        setQuery={setQuery}
        onSubmit={submitSearch}
        show={route.name === 'users'}
      />
      {view.name === 'loading' ? <h1 id="portal-title">Loading records</h1> : null}
      {view.name === 'home' ? (
        <>
          <h1 id="portal-title">Staff session</h1>
          <p>Role: Operator</p>
        </>
      ) : null}
      {view.name === 'denied' ? (
        <>
          <h1 id="portal-title">Staff access unavailable</h1>
          <p role="alert">Staff access is not active for this account. Contact your administrator.</p>
        </>
      ) : null}
      {view.name === 'expired' ? (
        <>
          <h1 id="portal-title">Session expired</h1>
          <p role="alert">Your session has expired. Sign in again.</p>
        </>
      ) : null}
      {view.name === 'unavailable' ? (
        <>
          <h1 id="portal-title">Staff service unavailable</h1>
          <p role="alert">The staff service is temporarily unavailable. Try again.</p>
        </>
      ) : null}
      {view.name === 'missing' ? (
        <>
          <h1 id="portal-title">Record unavailable</h1>
          <p role="alert">That record is not available.</p>
        </>
      ) : null}
      {view.name === 'empty' ? (
        <>
          <h1 id="portal-title">{route.name === 'disputes' ? 'Disputes' : 'Users'}</h1>
          <p>{view.message}</p>
        </>
      ) : null}
      {view.name === 'users' ? (
        <>
          <h1 id="portal-title">Users</h1>
          <div className="records">
            {view.items.map((user) => (
              <article key={user.id} className="record">
                <h2>{user.displayName}</h2>
                <p>{user.username}</p>
                <p>{user.email}</p>
                <p>
                  {user.accountType} · {user.accountStatus}
                  {user.deletedAt ? ' · Deleted' : ''}
                </p>
                <button type="button" onClick={() => open({ name: 'user', id: user.id })}>
                  View account
                </button>
              </article>
            ))}
          </div>
          {view.nextCursor ? (
            <button type="button" onClick={() => open({ name: 'users', query: view.query, cursor: view.nextCursor })}>
              Next
            </button>
          ) : null}
        </>
      ) : null}
      {view.name === 'user' ? <UserDetail user={view.user} /> : null}
      {view.name === 'disputes' ? (
        <>
          <h1 id="portal-title">Disputes</h1>
          <div className="records">
            {view.items.map((dispute) => (
              <article key={dispute.id} className="record">
                <h2>{dispute.title}</h2>
                <p>
                  {dispute.clientDisplayName ?? 'Name unavailable'} and {dispute.providerDisplayName ?? 'Name unavailable'}
                </p>
                <p>{dispute.disputeNote ?? 'No dispute note is recorded.'}</p>
                <PaymentLine payment={dispute.payment} />
                <button type="button" onClick={() => open({ name: 'dispute', id: dispute.id })}>
                  View dispute
                </button>
              </article>
            ))}
          </div>
          {view.nextCursor ? (
            <button type="button" onClick={() => open({ name: 'disputes', cursor: view.nextCursor })}>
              Next
            </button>
          ) : null}
        </>
      ) : null}
      {view.name === 'dispute' ? <DisputeDetail dispute={view.dispute} /> : null}
    </>
  )
}

function SearchForm({
  searchId,
  query,
  setQuery,
  onSubmit,
  show,
}: {
  searchId: string
  query: string
  setQuery: (value: string) => void
  onSubmit: (event: FormEvent) => void
  show: boolean
}) {
  if (!show) return null
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor={searchId}>Email, username, or account id</label>
      <input id={searchId} name="q" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="actions">
        <button type="submit">Search</button>
      </div>
    </form>
  )
}

function UserDetail({ user }: { user: StaffUserDetail }) {
  return (
    <>
      <h1 id="portal-title">{user.displayName}</h1>
      <p>{user.username}</p>
      <p>{user.email}</p>
      <p>
        {user.accountType} · {user.accountStatus}
      </p>
      <p>Created {formatWhen(user.createdAt)}</p>
      <p>{user.deletedAt ? `Deleted ${formatWhen(user.deletedAt)}` : 'Not deleted'}</p>
      <p>
        {user.followersCount} followers · {user.followingCount} following · {user.postsCount} posts
      </p>
      <p>
        {user.clientEngagementCount} client engagements · {user.providerEngagementCount} provider engagements
      </p>
      <p>Simulated payments: {user.simulatedPaymentCount}</p>
    </>
  )
}

function DisputeDetail({ dispute }: { dispute: StaffDispute }) {
  return (
    <>
      <h1 id="portal-title">{dispute.title}</h1>
      <p>Status: Disputed</p>
      <p>Client: {dispute.clientDisplayName ?? 'Name unavailable'}</p>
      <p>Provider: {dispute.providerDisplayName ?? 'Name unavailable'}</p>
      <p>{dispute.deletedAt ? `Engagement deleted ${formatWhen(dispute.deletedAt)}` : 'Engagement is not deleted'}</p>
      <p>{dispute.disputeNote ?? 'No dispute note is recorded.'}</p>
      {dispute.disputeAt ? <p>Dispute opened {formatWhen(dispute.disputeAt)}</p> : null}
      <PaymentLine payment={dispute.payment} />
    </>
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
  if (route.name === 'home') return { name: 'home' }
  if (route.name === 'users') {
    if (!route.query) return { name: 'empty', message: 'Search by email, username, or account id.' }
    return fromPage(await records.searchUsers(route.query, route.cursor), 'No accounts match that search.', (page) => ({
      name: 'users',
      query: route.query,
      items: page.items,
      nextCursor: page.nextCursor,
    }))
  }
  if (route.name === 'user') return fromOne(await records.user(route.id), (user) => ({ name: 'user', user }))
  if (route.name === 'disputes') {
    return fromPage(await records.disputes(route.cursor), 'No disputed work is open.', (page) => ({
      name: 'disputes',
      items: page.items,
      nextCursor: page.nextCursor,
    }))
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

function failure(kind: 'denied' | 'expired' | 'unavailable' | 'not-found'): View {
  if (kind === 'denied') return { name: 'denied' }
  if (kind === 'expired') return { name: 'expired' }
  if (kind === 'not-found') return { name: 'missing' }
  return { name: 'unavailable' }
}
