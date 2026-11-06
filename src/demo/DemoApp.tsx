import { createElement, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { PortalFrame, type PortalSection } from '../portal/PortalFrame'
import { OperationsView } from '../staff/OperationsView'
import './demo.css'
import {
  applications,
  audit,
  disputes as seedDisputes,
  engagements,
  invoices,
  jobs,
  nameOf,
  operationsExample,
  overviewCounts,
  payments,
  PERIOD_LABEL,
  reports as seedReports,
  services as seedServices,
  staff,
  users as seedUsers,
  type DemoDispute,
  type DemoReport,
  type DemoService,
  type DemoUser,
} from './fixtures'

type Section = 'overview' | 'users' | 'marketplace' | 'reports' | 'disputes' | 'payments' | 'operations' | 'staff'

type Route =
  | { section: 'sign-in' }
  | { section: 'authenticator' }
  | { section: 'overview' }
  | { section: 'users'; query: string; status: string; type: string }
  | { section: 'user'; id: string }
  | { section: 'marketplace'; tab: 'jobs' | 'services' | 'applications' | 'engagements'; status: string }
  | { section: 'job' | 'service' | 'application' | 'engagement'; id: string }
  | { section: 'reports'; type: string; status: string }
  | { section: 'report'; id: string }
  | { section: 'disputes' }
  | { section: 'dispute'; id: string }
  | { section: 'payments'; status: string }
  | { section: 'invoice'; id: string }
  | { section: 'operations'; example: 'normal' | 'stale' | 'unavailable' | 'unconfigured' }
  | { section: 'staff' }

type Dialog =
  | { kind: 'suspend'; id: string }
  | { kind: 'delete-user' }
  | { kind: 'hide-service'; id: string }
  | { kind: 'cancel-engagement' }
  | { kind: 'report'; id: string; action: 'dismiss' | 'escalate' | 'hide' | 'restore' }
  | { kind: 'staff' }

function initialRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash === 'authenticator') return { section: 'authenticator' }
  if (hash === 'overview') return { section: 'overview' }
  if (hash === 'users') return { section: 'users', query: '', status: 'all', type: 'all' }
  if (hash.startsWith('user/')) return { section: 'user', id: hash.slice(5) }
  if (hash === 'marketplace') return { section: 'marketplace', tab: 'jobs', status: 'all' }
  if (hash === 'reports') return { section: 'reports', type: 'all', status: 'open' }
  if (hash === 'disputes') return { section: 'disputes' }
  if (hash === 'payments') return { section: 'payments', status: 'all' }
  if (hash === 'monitoring') return { section: 'operations', example: 'normal' }
  if (hash === 'staff') return { section: 'staff' }
  return { section: 'sign-in' }
}

function hashFor(route: Route): string {
  if (route.section === 'operations') return 'monitoring'
  if (route.section === 'user') return `user/${route.id}`
  if (route.section === 'sign-in') return 'sign-in'
  return route.section
}

const NAV_SECTION: Record<Section, PortalSection> = {
  overview: 'overview',
  users: 'users',
  marketplace: 'marketplace',
  reports: 'reports',
  disputes: 'disputes',
  payments: 'payments',
  operations: 'operations',
  staff: 'staff',
}

export function DemoApp() {
  const [route, setRoute] = useState<Route>(initialRoute)
  const [stack, setStack] = useState<Route[]>([])
  const [people, setPeople] = useState(seedUsers)
  const [catalog, setCatalog] = useState(seedServices)
  const [queue, setQueue] = useState(seedReports)
  const [cases, setCases] = useState(seedDisputes)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const next = `#${hashFor(route)}`
    if (window.location.hash !== next) window.history.replaceState(null, '', next)
  }, [route])

  useEffect(() => {
    function onHashChange() {
      setStack([])
      setRoute(initialRoute())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function reset() {
    setPeople(seedUsers)
    setCatalog(seedServices)
    setQueue(seedReports)
    setCases(seedDisputes)
    setDialog(null)
    setNotice(null)
    setStack([])
    setRoute({ section: 'sign-in' })
  }

  function go(next: Route, remember = true) {
    setNotice(null)
    if (remember && route.section !== 'sign-in' && route.section !== 'authenticator') {
      setStack((current) => [...current, route])
    }
    setRoute(next)
  }

  function jump(section: PortalSection) {
    setNotice(null)
    setStack([])
    if (section === 'users') setRoute({ section, query: '', status: 'all', type: 'all' })
    else if (section === 'marketplace') setRoute({ section, tab: 'jobs', status: 'all' })
    else if (section === 'reports') setRoute({ section, type: 'all', status: 'open' })
    else if (section === 'payments') setRoute({ section, status: 'all' })
    else if (section === 'operations') setRoute({ section, example: 'normal' })
    else setRoute({ section } as Route)
  }

  function back() {
    setNotice(null)
    setStack((current) => {
      const previous = current[current.length - 1]
      if (previous) setRoute(previous)
      return current.slice(0, -1)
    })
  }

  if (route.section === 'sign-in' || route.section === 'authenticator') {
    return (
      <div className="demo-sign">
        <section className="card" aria-labelledby="portal-title">
          <p className="brand">Mawahib</p>
          <p className="demo-banner">Demo — synthetic data</p>
          {route.section === 'sign-in' ? (
            <DemoSignIn onEnter={() => setRoute({ section: 'authenticator' })} />
          ) : (
            <>
              <h1 id="portal-title">Demo authenticator</h1>
              <p>This step is mocked. It does not enroll a factor, check a code, or create a session.</p>
              <div className="actions">
                <button type="button" onClick={() => jump('overview')}>
                  Continue into the demo
                </button>
                <button type="button" className="secondary" onClick={() => setRoute({ section: 'sign-in' })}>
                  Back
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )
  }

  const section = route.section === 'user' ? 'users' : route.section === 'job' || route.section === 'service' || route.section === 'application' || route.section === 'engagement' ? 'marketplace' : route.section === 'report' ? 'reports' : route.section === 'dispute' ? 'disputes' : route.section === 'invoice' ? 'payments' : route.section

  return (
    <>
      <PortalFrame
        current={NAV_SECTION[section]}
        title={titleFor(route)}
        banner="Demo — synthetic data"
        onNavigate={jump}
        onSignOut={reset}
        signOutLabel="Demo sign out"
        showBack={stack.length > 0}
        onBack={back}
      >
        {notice ? <p role="status">{notice}</p> : null}
        <Screen
          route={route}
          people={people}
          catalog={catalog}
          queue={queue}
          cases={cases}
          go={go}
          setDialog={setDialog}
          setNotice={setNotice}
        />
      </PortalFrame>
      {dialog ? (
        <DemoDialog
          dialog={dialog}
          people={people}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            applyDialog(dialog, { setPeople, setCatalog, setQueue, setNotice })
            setDialog(null)
          }}
        />
      ) : null}
    </>
  )
}

function DemoSignIn({ onEnter }: { onEnter: () => void }) {
  return (
    <>
      <h1 id="portal-title">Staff sign in</h1>
      <p>Real sign-in is not used in this demo. No password is sent.</p>
      <div className="actions">
        <button type="button" onClick={onEnter}>
          Enter demo
        </button>
      </div>
    </>
  )
}

function Screen(props: {
  route: Route
  people: DemoUser[]
  catalog: DemoService[]
  queue: DemoReport[]
  cases: DemoDispute[]
  go: (route: Route, remember?: boolean) => void
  setDialog: (dialog: Dialog) => void
  setNotice: (notice: string) => void
}) {
  const { route, people, go } = props
  if (route.section === 'overview') return <Overview people={people} queue={props.queue} go={go} />
  if (route.section === 'users') return <Users route={route} people={people} go={go} />
  if (route.section === 'user') return <UserDetail id={route.id} people={people} setDialog={props.setDialog} />
  if (route.section === 'marketplace') return <Marketplace key={route.tab} route={route} people={people} catalog={props.catalog} go={go} />
  if (route.section === 'job') return <JobDetail id={route.id} go={go} />
  if (route.section === 'service') return <ServiceDetail id={route.id} catalog={props.catalog} setDialog={props.setDialog} />
  if (route.section === 'application') return <ApplicationDetail id={route.id} go={go} />
  if (route.section === 'engagement') return <EngagementDetail id={route.id} go={go} setDialog={props.setDialog} />
  if (route.section === 'reports') return <Reports route={route} queue={props.queue} go={go} />
  if (route.section === 'report') return <ReportDetail id={route.id} queue={props.queue} setDialog={props.setDialog} />
  if (route.section === 'disputes') return <Disputes cases={props.cases} go={go} />
  if (route.section === 'dispute') return <DisputeDetail id={route.id} cases={props.cases} go={go} />
  if (route.section === 'payments') return <Payments route={route} go={go} />
  if (route.section === 'invoice') return <InvoiceDetail id={route.id} go={go} />
  if (route.section === 'operations') return <Monitoring example={route.example} go={go} setNotice={props.setNotice} />
  return <StaffScreen setDialog={props.setDialog} />
}

function Overview({ people, queue, go }: { people: DemoUser[]; queue: DemoReport[]; go: (route: Route) => void }) {
  const counts = overviewCounts({ users: people, reports: queue })
  const cards: { id: string; title: string; value: number; detail: string; period?: string; route: Route }[] = [
    { id: 'users', title: 'Total users', value: counts.users, detail: `${counts.talent} talent · ${counts.business} business`, route: { section: 'users', query: '', status: 'all', type: 'all' } },
    { id: 'new-users', title: 'New users', value: counts.newUsers, detail: 'Joined during the selected period', period: PERIOD_LABEL, route: { section: 'users', query: '', status: 'all', type: 'all' } },
    { id: 'jobs', title: 'Open jobs', value: counts.openJobs, detail: 'Currently accepting applications', route: { section: 'marketplace', tab: 'jobs', status: 'open' } },
    { id: 'services', title: 'Published services', value: counts.activeServices, detail: 'Currently published', route: { section: 'marketplace', tab: 'services', status: 'published' } },
    { id: 'engagements', title: 'Ongoing engagements', value: counts.ongoingEngagements, detail: 'In progress or disputed', route: { section: 'marketplace', tab: 'engagements', status: 'ongoing' } },
    { id: 'reports', title: 'Open reports', value: counts.openReports, detail: 'Awaiting review', route: { section: 'reports', type: 'all', status: 'open' } },
    { id: 'disputes', title: 'Open disputes', value: counts.openDisputes, detail: 'Work disagreements awaiting resolution', route: { section: 'disputes' } },
    { id: 'payments', title: 'Failed payment attempts', value: counts.failedPayments, detail: 'Simulated transactions', route: { section: 'payments', status: 'failed' } },
  ]
  return (
    <>
      <details className="demo-note">
        <summary>About these counts</summary>
        <p>Current totals count the records in this demo. New users counts only accounts created during the selected period. Payment amounts are simulated and are not revenue.</p>
      </details>
      <div className="demo-metrics">
        {cards.map((card) => (
          <button key={card.id} type="button" className="demo-metric" aria-labelledby={`metric-${card.id}-title`} aria-describedby={`metric-${card.id}-detail`} onClick={() => go(card.route)}>
            <span id={`metric-${card.id}-title`} className="metric-title">{card.title}</span>
            <span className="metric-value">{card.value}</span>
            <span id={`metric-${card.id}-detail`} className="metric-detail">{card.detail}</span>
            {card.period ? <span className="metric-period">{card.period}</span> : null}
          </button>
        ))}
      </div>
      <h2>Needs attention</h2>
      <article className="demo-row">
        <p>One monitoring example is stale. A successful deployment is not current application health.</p>
        <button type="button" className="text-action" onClick={() => go({ section: 'operations', example: 'stale' })}>Open monitoring</button>
      </article>
    </>
  )
}

function Users({ route, people, go }: { route: Extract<Route, { section: 'users' }>; people: DemoUser[]; go: (route: Route) => void }) {
  const [query, setQuery] = useState(route.query)
  const [status, setStatus] = useState(route.status)
  const [type, setType] = useState(route.type)
  const shown = people.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.username}`.toLowerCase()
    if (query && !haystack.includes(query.trim().toLowerCase())) return false
    if (status !== 'all' && user.accountStatus !== status) return false
    if (type !== 'all' && user.accountType !== type) return false
    return true
  })
  return (
    <>
      <Filters onReset={() => { setQuery(''); setStatus('all'); setType('all') }}>
        <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <SelectControl label="Status" value={status} onChange={setStatus}>
          <option value="all">All</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </SelectControl>
        <SelectControl label="Type" value={type} onChange={setType}>
          <option value="all">All</option>
          <option value="talent">Talent</option>
          <option value="business">Business</option>
        </SelectControl>
      </Filters>
      {shown.length === 0 ? <p>No accounts match those filters.</p> : null}
      <div className="demo-list">
        {shown.map((user) => (
          <article key={user.id} className="demo-row">
            <div>
              <p><strong>{user.name}</strong></p>
              <p>{user.username} · {user.email}</p>
              <p><Status value={user.accountStatus} /> <Status value={user.accountType} /></p>
            </div>
            <button type="button" className="text-action" onClick={() => go({ section: 'user', id: user.id })}>View</button>
          </article>
        ))}
      </div>
    </>
  )
}

function UserDetail({ id, people, setDialog }: { id: string; people: DemoUser[]; setDialog: (dialog: Dialog) => void }) {
  const user = people.find((item) => item.id === id)
  if (!user) return <p>That record is not available.</p>
  const action = user.accountStatus === 'SUSPENDED' ? 'Restore' : 'Suspend'
  return (
    <article className="demo-panel">
      <p>{user.email}</p>
      <p>{user.username}</p>
      <p><Status value={user.accountStatus} /> <Status value={user.accountType} /></p>
      <p>{user.posts} posts · {user.engagements} engagements</p>
      <p>{user.createdAt >= '2026-10-29T00:00:00.000Z' ? `Joined during ${PERIOD_LABEL}` : 'Joined before the selected period'}</p>
      <div className="actions">
        <button type="button" onClick={() => setDialog({ kind: 'suspend', id: user.id })}>{action}</button>
        <button type="button" className="secondary" onClick={() => setDialog({ kind: 'delete-user' })}>Delete account</button>
      </div>
      <h2>Action history</h2>
      {user.history.length === 0 ? <p>No account actions are recorded.</p> : user.history.map((item) => <p key={item.id}>{item.action}: {item.reason}</p>)}
    </article>
  )
}

function Marketplace({ route, catalog, go }: { route: Extract<Route, { section: 'marketplace' }>; people: DemoUser[]; catalog: DemoService[]; go: (route: Route, remember?: boolean) => void }) {
  const [status, setStatus] = useState(route.status)
  return (
    <>
      <div className="demo-tabs" role="tablist" aria-label="Marketplace">
        {(['jobs', 'services', 'applications', 'engagements'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={route.tab === tab} onClick={() => go({ section: 'marketplace', tab, status: 'all' }, false)}>{label(tab)}</button>
        ))}
      </div>
      <Filters onReset={() => setStatus('all')}>
        <SelectControl label="Status" value={status} onChange={setStatus}>{statusOptions(route.tab)}</SelectControl>
      </Filters>
      {route.tab === 'jobs' ? <JobList status={status} go={go} /> : null}
      {route.tab === 'services' ? <ServiceList status={status} catalog={catalog} go={go} /> : null}
      {route.tab === 'applications' ? <ApplicationList status={status} go={go} /> : null}
      {route.tab === 'engagements' ? <EngagementList status={status} go={go} /> : null}
    </>
  )
}

function JobList({ status, go }: { status: string; go: (route: Route) => void }) {
  const shown = jobs.filter((job) => status === 'all' || job.status === status)
  if (shown.length === 0) return <p>No jobs match that filter.</p>
  return <div className="demo-list">{shown.map((job) => <article key={job.id} className="demo-row"><div><p><strong>{job.title}</strong></p><p>{nameOf(job.posterId)} · <Status value={job.status} /></p></div><button type="button" onClick={() => go({ section: 'job', id: job.id })}>View job</button></article>)}</div>
}

function ServiceList({ status, catalog, go }: { status: string; catalog: DemoService[]; go: (route: Route) => void }) {
  const shown = catalog.filter((service) => status === 'all' || service.status === status)
  if (shown.length === 0) return <p>No services match that filter.</p>
  return <div className="demo-list">{shown.map((service) => <article key={service.id} className="demo-row"><div><p><strong>{service.title}</strong></p><p>{nameOf(service.ownerId)} · <Status value={service.status} /></p></div><button type="button" onClick={() => go({ section: 'service', id: service.id })}>View service</button></article>)}</div>
}

function ApplicationList({ status, go }: { status: string; go: (route: Route) => void }) {
  const shown = applications.filter((item) => status === 'all' || item.status === status)
  if (shown.length === 0) return <p>No applications match that filter.</p>
  return <div className="demo-list">{shown.map((item) => <article key={item.id} className="demo-row"><div><p><strong>{jobs.find((job) => job.id === item.jobId)?.title}</strong></p><p>{nameOf(item.applicantId)} · <Status value={item.status} /></p></div><button type="button" onClick={() => go({ section: 'application', id: item.id })}>View application</button></article>)}</div>
}

function EngagementList({ status, go }: { status: string; go: (route: Route) => void }) {
  const shown = engagements.filter((item) => status === 'all' || (status === 'ongoing' ? item.status !== 'completed' : item.status === status))
  if (shown.length === 0) return <p>No engagements match that filter.</p>
  return <div className="demo-list">{shown.map((item) => <article key={item.id} className="demo-row"><div><p><strong>{item.title}</strong></p><p>{nameOf(item.clientId)} and {nameOf(item.providerId)} · <Status value={item.status} /></p></div><button type="button" onClick={() => go({ section: 'engagement', id: item.id })}>View engagement</button></article>)}</div>
}

function JobDetail({ id, go }: { id: string; go: (route: Route) => void }) {
  const job = jobs.find((item) => item.id === id)
  if (!job) return <p>That record is not available.</p>
  return <article className="demo-panel"><p><Status value={job.status} /></p><p>Posted by {nameOf(job.posterId)}</p><p>Hiding this listing would not cancel an engagement.</p><button type="button" onClick={() => go({ section: 'users', query: nameOf(job.posterId), status: 'all', type: 'all' })}>View poster</button></article>
}

function ServiceDetail({ id, catalog, setDialog }: { id: string; catalog: DemoService[]; setDialog: (dialog: Dialog) => void }) {
  const service = catalog.find((item) => item.id === id)
  if (!service) return <p>That record is not available.</p>
  return (
    <article className="demo-panel">
      <p>{nameOf(service.ownerId)} · <Status value={service.status} /></p>
      <p>Hiding a service removes it from discovery. It does not cancel work already underway.</p>
      <button type="button" onClick={() => setDialog({ kind: 'hide-service', id: service.id })}>{service.status === 'hidden' ? 'Restore listing' : 'Hide listing'}</button>
    </article>
  )
}

function ApplicationDetail({ id, go }: { id: string; go: (route: Route) => void }) {
  const item = applications.find((entry) => entry.id === id)
  if (!item) return <p>That record is not available.</p>
  const job = jobs.find((entry) => entry.id === item.jobId)
  return <article className="demo-panel"><p><Status value={item.status} /></p><p>{nameOf(item.applicantId)} applied to {job?.title}</p><button type="button" onClick={() => job && go({ section: 'job', id: job.id })}>View job</button></article>
}

function EngagementDetail({ id, go, setDialog }: { id: string; go: (route: Route) => void; setDialog: (dialog: Dialog) => void }) {
  const item = engagements.find((entry) => entry.id === id)
  if (!item) return <p>That record is not available.</p>
  return (
    <article className="demo-panel">
      <p>{nameOf(item.clientId)} and {nameOf(item.providerId)}</p>
      <p><Status value={item.status} /></p>
      <div className="actions">
        {item.jobId ? <button type="button" onClick={() => go({ section: 'job', id: item.jobId as string })}>View job</button> : null}
        <button type="button" className="secondary" onClick={() => setDialog({ kind: 'cancel-engagement' })}>Cancel engagement</button>
      </div>
    </article>
  )
}

function Reports({ route, queue, go }: { route: Extract<Route, { section: 'reports' }>; queue: DemoReport[]; go: (route: Route) => void }) {
  const [type, setType] = useState(route.type)
  const [status, setStatus] = useState(route.status)
  const shown = queue.filter((report) => (type === 'all' || report.targetType === type) && (status === 'all' || report.status === status))
  return (
    <>
      <p>Report storage is not implemented yet. The mobile report sheet does not save a report. These rows exist only in the demo.</p>
      <Filters onReset={() => { setType('all'); setStatus('open') }}>
        <SelectControl label="Target" value={type} onChange={setType}>
          <option value="all">All</option>
          <option value="user">Users</option>
          <option value="post">Posts</option>
          <option value="comment">Comments</option>
          <option value="review">Reviews</option>
          <option value="job">Jobs</option>
          <option value="service">Services</option>
        </SelectControl>
        <SelectControl label="Status" value={status} onChange={setStatus}>
          <option value="open">Open</option>
          <option value="all">All</option>
          <option value="dismissed">Dismissed</option>
          <option value="escalated">Escalated</option>
          <option value="hidden">Hidden</option>
        </SelectControl>
      </Filters>
      {shown.length === 0 ? <p>No reports match those filters.</p> : (
        <div className="demo-table-wrap">
          <table className="demo-table">
            <thead>
              <tr><th>Reported item</th><th>Type</th><th>Reason</th><th>Status</th><th>Submitted</th><th><span className="sr-only">Action</span></th></tr>
            </thead>
            <tbody>
              {shown.map((report) => (
                <tr key={report.id}>
                  <td>{report.targetLabel}</td>
                  <td>{report.targetType}</td>
                  <td>{report.reason}</td>
                  <td><Status value={report.status} tone={report.status === 'open' ? 'warn' : report.status === 'dismissed' ? 'ok' : 'neutral'} /></td>
                  <td>{formatDay(report.submittedAt)}</td>
                  <td><button type="button" className="text-action" onClick={() => go({ section: 'report', id: report.id })}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function ReportDetail({ id, queue, setDialog }: { id: string; queue: DemoReport[]; setDialog: (dialog: Dialog) => void }) {
  const report = queue.find((item) => item.id === id)
  if (!report) return <p>That record is not available.</p>
  return (
    <article className="demo-panel">
      <p>{report.reason}</p>
      <p>Target: {report.targetLabel} ({report.targetType})</p>
      <p><Status value={report.status} /></p>
      <p>Assignment: {report.assignee ?? 'Unassigned'}</p>
      <h2>Notes</h2>
      {report.notes.length === 0 ? <p>No internal notes yet.</p> : report.notes.map((note) => <p key={note.id}>{note.text}</p>)}
      <div className="actions">
        <button type="button" onClick={() => setDialog({ kind: 'report', id, action: 'dismiss' })}>Dismiss</button>
        <button type="button" onClick={() => setDialog({ kind: 'report', id, action: 'escalate' })}>Escalate</button>
        <button type="button" className="secondary" onClick={() => setDialog({ kind: 'report', id, action: report.status === 'hidden' ? 'restore' : 'hide' })}>{report.status === 'hidden' ? 'Restore' : 'Hide'}</button>
      </div>
      <p>Hiding is reversible in this demo. Permanent deletion is a separate operation and is not available.</p>
    </article>
  )
}

function Disputes({ cases, go }: { cases: DemoDispute[]; go: (route: Route) => void }) {
  return (
    <>
      <p>Work and payment disagreements stay separate from content reports.</p>
      <div className="demo-list">
        {cases.map((item) => (
          <article key={item.id} className="demo-row">
            <div><p><strong>{item.title}</strong></p><p><Status value={item.stage} /> · {item.assignee}</p></div>
            <button type="button" onClick={() => go({ section: 'dispute', id: item.id })}>View dispute</button>
          </article>
        ))}
      </div>
    </>
  )
}

function DisputeDetail({ id, cases, go }: { id: string; cases: DemoDispute[]; go: (route: Route) => void }) {
  const item = cases.find((entry) => entry.id === id)
  const engagement = engagements.find((entry) => entry.id === item?.engagementId)
  if (!item || !engagement) return <p>That record is not available.</p>
  return (
    <article className="demo-panel">
      <p>Stage: <Status value={item.stage} /></p>
      <p>{nameOf(engagement.clientId)} and {nameOf(engagement.providerId)}</p>
      <p>Assignment: {item.assignee}</p>
      <p>{item.note}</p>
      <h2>Activity</h2>
      {item.history.map((entry) => <p key={entry.id}>{entry.text}</p>)}
      <h2>Private evidence</h2>
      <p>Restricted. This demo does not open messages or documents.</p>
      <button type="button" onClick={() => go({ section: 'engagement', id: engagement.id })}>View engagement</button>
    </article>
  )
}

function Payments({ route, go }: { route: Extract<Route, { section: 'payments' }>; go: (route: Route) => void }) {
  const [status, setStatus] = useState(route.status)
  const shown = payments.filter((payment) => status === 'all' || payment.status === status)
  return (
    <>
      <p className="section-note">Amounts in this list are simulated. They are not revenue.</p>
      <Filters onReset={() => setStatus('all')}>
        <SelectControl label="Status" value={status} onChange={setStatus}>
          <option value="all">All</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </SelectControl>
      </Filters>
      {shown.length === 0 ? <p>No payment attempts match that filter.</p> : (
        <div className="demo-table-wrap">
          <table className="demo-table">
            <thead>
              <tr><th>Amount</th><th>User</th><th>Engagement</th><th>Status</th><th>Date</th><th><span className="sr-only">Invoice</span></th></tr>
            </thead>
            <tbody>
              {shown.map((payment) => {
                const engagement = engagements.find((item) => item.id === payment.engagementId)
                return (
                  <tr key={payment.id}>
                    <td>{payment.amount} {payment.currency} <span className="pill">Simulated</span></td>
                    <td>{nameOf(payment.userId)}</td>
                    <td>{engagement?.title ?? 'Reference unavailable'}</td>
                    <td><Status value={payment.status === 'succeeded' ? 'Succeeded' : 'Failed'} tone={payment.status === 'succeeded' ? 'ok' : 'danger'} /></td>
                    <td>{formatDay(payment.at)}</td>
                    <td>{payment.invoiceId ? <button type="button" className="text-action" onClick={() => go({ section: 'invoice', id: payment.invoiceId as string })}>Invoice</button> : 'None'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="quiet-note">Refunds are not available in this preview.</p>
    </>
  )
}

function InvoiceDetail({ id, go }: { id: string; go: (route: Route) => void }) {
  const invoice = invoices.find((item) => item.id === id)
  const payment = payments.find((item) => item.id === invoice?.paymentId)
  if (!invoice || !payment) return <p>That record is not available.</p>
  return (
    <article className="demo-panel">
      <p>{invoice.number}</p>
      <p>{invoice.amount} {invoice.currency} · Simulated</p>
      <p>{nameOf(payment.userId)}</p>
      <button type="button" onClick={() => go({ section: 'engagement', id: payment.engagementId })}>View engagement</button>
      <p>Editing or deleting a financial record is not available.</p>
    </article>
  )
}

function Monitoring({ example, go, setNotice }: { example: 'normal' | 'stale' | 'unavailable' | 'unconfigured'; go: (route: Route, remember?: boolean) => void; setNotice: (notice: string) => void }) {
  const [refreshing, setRefreshing] = useState(false)
  return (
    <>
      <div className="monitor-tools">
        <SelectControl label="Demo scenario" ariaLabel="Demo scenario" value={example} onChange={(value) => go({ section: 'operations', example: value as typeof example }, false)}>
          <option value="normal">Normal</option>
          <option value="stale">Stale</option>
          <option value="unavailable">Unavailable</option>
          <option value="unconfigured">Not configured</option>
        </SelectControl>
        <button
          type="button"
          className="secondary"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            window.setTimeout(() => {
              setRefreshing(false)
              setNotice('Refresh does not contact Railway, Supabase, or UptimeRobot.')
            }, 400)
          }}
        >
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
      <OperationsView embedded overview={operationsExample(example)} onRefresh={() => undefined} />
    </>
  )
}

function StaffScreen({ setDialog }: { setDialog: (dialog: Dialog) => void }) {
  return (
    <>
      <p className="quiet-note">This session is an operator. Operators do not manage other staff.</p>
      <div className="demo-table-wrap">
        <table className="demo-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Membership</th></tr></thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td><Status value={member.status === 'active' ? 'Active' : 'Pending'} tone={member.status === 'active' ? 'ok' : 'warn'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Action history</h2>
      <div className="demo-table-wrap">
        <table className="demo-table">
          <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Time</th><th>Reason</th></tr></thead>
          <tbody>
            {audit.map((item) => (
              <tr key={item.id}>
                <td>{item.actor}</td>
                <td>{item.action}</td>
                <td>{item.target}</td>
                <td>{formatDay(item.at)}</td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="demo-note">
        <summary>Activation layout</summary>
        <p>Not implemented. An operator cannot activate or deactivate staff. Opening this does not change access.</p>
        <button type="button" className="secondary" onClick={() => setDialog({ kind: 'staff' })}>Review the layout</button>
      </details>
    </>
  )
}

function DemoDialog({ dialog, people, onClose, onConfirm }: { dialog: Dialog; people: DemoUser[]; onClose: () => void; onConfirm: () => void }) {
  const reasonId = useId()
  const [reason, setReason] = useState('Account review requested')
  const user = dialog.kind === 'suspend' ? people.find((item) => item.id === dialog.id) : null
  const title = dialog.kind === 'delete-user' ? 'Delete account' : dialog.kind === 'staff' ? 'Staff activation' : dialog.kind === 'cancel-engagement' ? 'Cancel engagement' : dialog.kind === 'hide-service' ? 'Listing visibility' : dialog.kind === 'suspend' ? `${user?.accountStatus === 'SUSPENDED' ? 'Restore' : 'Suspend'} account` : 'Report action'
  const blocked = dialog.kind === 'delete-user' || dialog.kind === 'staff' || dialog.kind === 'cancel-engagement'
  return (
    <dialog open aria-labelledby="demo-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <h2 id="demo-dialog-title">{title}</h2>
      {dialog.kind === 'delete-user' ? <p>Not implemented. Account deletion waits on defined consequences for messages, payments, and retained records. This preview cannot delete anything.</p> : null}
      {dialog.kind === 'staff' ? <p>Not implemented. An operator cannot activate or deactivate staff. This preview does not change access.</p> : null}
      {dialog.kind === 'cancel-engagement' ? <p>Not implemented. Cancelling work is separate from hiding a listing. This preview does not cancel the engagement.</p> : null}
      {dialog.kind === 'suspend' ? <p>This confirmation changes only the demo record for {user?.name}.</p> : null}
      {dialog.kind === 'hide-service' ? <p>This changes only the demo listing. Engagements stay as they are.</p> : null}
      {dialog.kind === 'report' ? <p>This {dialog.action} action changes only the demo report. Permanent deletion is not included.</p> : null}
      {dialog.kind === 'suspend' || dialog.kind === 'report' ? (
        <label htmlFor={reasonId}>Reason<textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      ) : null}
      <div className="actions">
        {blocked ? null : <button type="button" onClick={onConfirm}>Confirm</button>}
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  )
}

function applyDialog(dialog: Dialog, setters: {
  setPeople: (value: DemoUser[] | ((current: DemoUser[]) => DemoUser[])) => void
  setCatalog: (value: DemoService[] | ((current: DemoService[]) => DemoService[])) => void
  setQueue: (value: DemoReport[] | ((current: DemoReport[]) => DemoReport[])) => void
  setNotice: (notice: string) => void
}) {
  if (dialog.kind === 'suspend') {
    setters.setPeople((current) => current.map((user) => user.id === dialog.id ? { ...user, accountStatus: user.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED', history: [{ id: `demo-${user.history.length}`, action: user.accountStatus === 'SUSPENDED' ? 'Restored' : 'Suspended', at: '2026-11-05T12:00:00.000Z', reason: 'Account review requested' }, ...user.history] } : user))
    setters.setNotice('The demo account status changed. This did not call the staff API.')
  }
  if (dialog.kind === 'hide-service') {
    setters.setCatalog((current) => current.map((service) => service.id === dialog.id ? { ...service, status: service.status === 'hidden' ? 'published' : 'hidden' } : service))
    setters.setNotice('The demo listing visibility changed. Engagements were not cancelled.')
  }
  if (dialog.kind === 'report') {
    const status = dialog.action === 'dismiss' ? 'dismissed' : dialog.action === 'escalate' ? 'escalated' : dialog.action === 'hide' ? 'hidden' : 'open'
    setters.setQueue((current) => current.map((report) => report.id === dialog.id ? { ...report, status, notes: [{ id: `note-${report.notes.length}`, at: '2026-11-05T12:00:00.000Z', text: `Demo ${dialog.action}.` }, ...report.notes] } : report))
    setters.setNotice('The demo report changed. No moderation API was called.')
  }
}

function SelectControl({ label, value, onChange, children, ariaLabel }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; ariaLabel?: string }) {
  return (
    <label>
      {label}
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
        <button type="button" tabIndex={-1} aria-hidden="true">
          {createElement('selectedcontent')}
        </button>
        {children}
      </select>
    </label>
  )
}

function Filters({ children, onReset }: { children: ReactNode; onReset: () => void }) {
  function submit(event: FormEvent) { event.preventDefault() }
  return (
    <form className="demo-filters" onSubmit={submit}>
      {children}
      <button type="button" className="secondary" onClick={onReset}>Reset</button>
    </form>
  )
}

function Status({ value, tone }: { value: string; tone?: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  const resolved = tone ?? (value === 'ACTIVE' || value === 'open' || value === 'published' || value === 'succeeded' || value === 'Succeeded' || value === 'Active' ? 'ok' : value === 'SUSPENDED' || value === 'failed' || value === 'Failed' || value === 'disputed' || value === 'hidden' ? 'danger' : value === 'Pending' || value === 'pending' ? 'warn' : 'neutral')
  return <span className={`pill ${resolved}`}>{value}</span>
}

function formatDay(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusOptions(tab: string) {
  if (tab === 'jobs') return <><option value="all">All</option><option value="open">Open</option><option value="closed">Closed</option></>
  if (tab === 'services') return <><option value="all">All</option><option value="published">Published</option><option value="hidden">Hidden</option></>
  if (tab === 'applications') return <><option value="all">All</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></>
  return <><option value="all">All</option><option value="ongoing">Ongoing</option><option value="in_progress">In progress</option><option value="disputed">Disputed</option><option value="completed">Completed</option></>
}

function label(value: string): string {
  if (value === 'jobs') return 'Jobs'
  if (value === 'services') return 'Services'
  if (value === 'applications') return 'Applications'
  if (value === 'engagements') return 'Engagements'
  if (value === 'normal') return 'Normal'
  if (value === 'stale') return 'Stale'
  if (value === 'unavailable') return 'Unavailable'
  return 'Not configured'
}

function titleFor(route: Route): string {
  if (route.section === 'overview') return 'Overview'
  if (route.section === 'users') return 'Users'
  if (route.section === 'user') return 'Account'
  if (route.section === 'marketplace') return 'Marketplace'
  if (route.section === 'reports' || route.section === 'report') return 'Reports'
  if (route.section === 'disputes' || route.section === 'dispute') return 'Disputes'
  if (route.section === 'payments' || route.section === 'invoice') return 'Payments'
  if (route.section === 'operations') return 'Monitoring'
  if (route.section === 'staff') return 'Staff'
  return 'Detail'
}
