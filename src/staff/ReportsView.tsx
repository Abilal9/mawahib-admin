import { useState, type ReactNode } from 'react'
import type { AdminRecords, ReportStatusFilter, ReportTargetFilter, StaffReportDetail, StaffReportSummary } from './adminTypes'

const STATUSES: Array<{ id: ReportStatusFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
]

const TARGETS: Array<{ id: ReportTargetFilter; label: string }> = [
  { id: 'post_comment', label: 'Comment' },
  { id: 'work_request', label: 'Work request' },
  { id: 'user', label: 'Account' },
  { id: 'post', label: 'Post' },
  { id: 'engagement_review', label: 'Review' },
  { id: 'job_listing', label: 'Job' },
  { id: 'service_offering', label: 'Service' },
]

const ACTION_HELP: Record<StaffReportDetail['status'], string> = {
  resolved: 'Resolve marks this report handled. It does not hide content or change an account.',
  dismissed: 'Dismiss closes this report without a content or account action.',
  open: 'Reopen puts this report back in the open queue. It does not restore content.',
}

export function ReportsList({
  items,
  statuses,
  targetTypes,
  nextCursor,
  matchCount,
  phase,
  onFilter,
  onOpen,
  onMore,
}: {
  items: StaffReportSummary[]
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  nextCursor: string | null
  matchCount: number | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onFilter: (statuses: ReportStatusFilter[], targetTypes: ReportTargetFilter[]) => void
  onOpen: (id: string) => void
  onMore: () => void
}) {
  return (
    <div className="demo-list">
      <ReportFilters statuses={statuses} targetTypes={targetTypes} onFilter={onFilter} />
      <p>{matchCount === null ? (phase === 'loading' ? 'Counting matching reports…' : 'Matching reports unavailable') : `Matching reports: ${matchCount}`}</p>
      <div className="report-results" aria-busy={phase === 'loading'}>
        {phase === 'loading' ? <p role="status">Loading reports…</p> : null}
        {phase === 'unavailable' ? <p role="alert">The report queue is temporarily unavailable. The filters are unchanged.</p> : null}
        {phase === 'denied' ? <p role="alert">Staff access is not active for this account.</p> : null}
        {phase === 'expired' ? <p role="alert">Your session has expired. Sign in again.</p> : null}
        {phase === 'ready' && items.length === 0 ? <p>No reports match these filters.</p> : null}
        {phase === 'ready' ? items.map((item) => (
          <article key={item.id} className="demo-row">
            <div>
              <p><strong>{labelTarget(item.targetType)}</strong> · {labelReason(item.reason)}</p>
              <p>{labelStatus(item.status)} · {formatWhen(item.createdAt)}</p>
              <p>Reported account: {item.reportedUser ? item.reportedUser.displayName : 'Unavailable'}</p>
            </div>
            <button type="button" className="text-action" onClick={() => onOpen(item.id)}>View report</button>
          </article>
        )) : null}
        {phase === 'ready' && nextCursor ? <button type="button" onClick={onMore}>Next</button> : null}
      </div>
    </div>
  )
}

function ReportFilters({
  statuses,
  targetTypes,
  onFilter,
}: {
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  onFilter: (statuses: ReportStatusFilter[], targetTypes: ReportTargetFilter[]) => void
}) {
  const [openMenu, setOpenMenu] = useState<'status' | 'target' | null>(null)
  const toggleStatus = (id: ReportStatusFilter) => {
    const next = statuses.includes(id) ? statuses.filter((item) => item !== id) : [...statuses, id]
    onFilter(next, targetTypes)
  }
  const toggleTarget = (id: ReportTargetFilter) => {
    const next = targetTypes.includes(id) ? targetTypes.filter((item) => item !== id) : [...targetTypes, id]
    onFilter(statuses, next)
  }
  return (
    <div className="report-filter-bar">
      <FilterMenu
        label={statuses.length === 0 ? 'All statuses' : 'Statuses'}
        open={openMenu === 'status'}
        onToggle={() => setOpenMenu(openMenu === 'status' ? null : 'status')}
        onDone={() => setOpenMenu(null)}
      >
        {STATUSES.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={statuses.includes(item.id)} onChange={() => toggleStatus(item.id)} />
            {item.label}
          </label>
        ))}
      </FilterMenu>
      <FilterMenu
        label={targetTypes.length === 0 ? 'All targets' : 'Targets'}
        open={openMenu === 'target'}
        onToggle={() => setOpenMenu(openMenu === 'target' ? null : 'target')}
        onDone={() => setOpenMenu(null)}
      >
        {TARGETS.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={targetTypes.includes(item.id)} onChange={() => toggleTarget(item.id)} />
            {item.label}
          </label>
        ))}
      </FilterMenu>
      <button type="button" onClick={() => onFilter([], [])}>Clear filters</button>
      <div className="report-chips">
        {statuses.map((status) => (
          <button key={status} type="button" onClick={() => toggleStatus(status)}>
            {labelStatus(status)} <span className="sr-only">Remove status filter</span>
          </button>
        ))}
        {targetTypes.map((target) => (
          <button key={target} type="button" onClick={() => toggleTarget(target)}>
            {labelTarget(target)} <span className="sr-only">Remove target filter</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterMenu({
  label,
  open,
  onToggle,
  onDone,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  onDone: () => void
  children: ReactNode
}) {
  return (
    <div className="report-menu">
      <button type="button" aria-expanded={open} onClick={onToggle}>{label}</button>
      {open ? (
        <div className="report-menu-panel" role="group" aria-label={label}>
          {children}
          <button type="button" onClick={onDone}>Done</button>
        </div>
      ) : null}
    </div>
  )
}

export function ReportDetail({
  report,
  records,
  onChanged,
  onOpenAccount,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
  onOpenAccount: (id: string) => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const actions = nextActions(report.status)
  async function submit(status: StaffReportDetail['status']) {
    const text = note.trim()
    if (busy || text.length < 1 || text.length > 500) return
    setBusy(true)
    setNotice(null)
    const result = await records.setReportStatus(report.id, { status, expectedStatus: report.status, note: text })
    setBusy(false)
    if (!result.ok) {
      setNotice(result.kind === 'conflict'
        ? 'This report changed. Refresh it before trying again.'
        : 'That change was not confirmed. The report status is unchanged.')
      return
    }
    setNote('')
    onChanged()
  }
  return (
    <article className="report-detail">
      <header className="report-header">
        <p className="metric-title">{labelTarget(report.targetType)}</p>
        <h2>{reportTitle(report)}</h2>
        <p><span className="report-badge">{labelStatus(report.status)}</span></p>
        <p>Submitted {formatWhen(report.createdAt)}</p>
        <p>Reference {report.id}</p>
      </header>
      <section className="report-panel">
        <h2>Reported content</h2>
        <ContentPanel report={report} />
      </section>
      <section className="report-panel report-complaint">
        <h2>Complaint</h2>
        <p>Reason: {labelReason(report.reason)}</p>
        <h3>Reporter’s explanation</h3>
        <p className="report-text">{report.details ?? 'No explanation was added.'}</p>
      </section>
      <section className="report-panel">
        <h2>People</h2>
        <PersonLine label="Reporter" person={report.reporter} onOpen={onOpenAccount} />
        <PersonLine label="Reported account" person={report.reportedUser} onOpen={onOpenAccount} />
      </section>
      <section className="report-panel">
        <h2>Report actions</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="report-note">Moderation note</label>
          <textarea id="report-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          <div className="report-filters">
            {actions.map((action) => (
              <button key={action} type="button" disabled={busy || note.trim().length < 1} onClick={() => void submit(action)}>
                {labelAction(action)}
              </button>
            ))}
          </div>
        </form>
        {actions.map((action) => <p key={action} className="quiet-note">{ACTION_HELP[action]}</p>)}
        {notice ? <p role="alert">{notice}</p> : null}
      </section>
      <section className="report-panel">
        <h2>History</h2>
        {report.history.length === 0 ? <p>No status changes yet.</p> : (
          <ol className="report-history">
            {report.history.map((event) => (
              <li key={event.id}>
                <p><strong>{labelAction(event.action)}</strong> · {event.actorLabel ?? 'Staff operator'} · {formatWhen(event.createdAt)}</p>
                {event.note ? <p className="report-text">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}

function ContentPanel({ report }: { report: StaffReportDetail }) {
  const target = report.target
  const state = typeof target.state === 'string' ? target.state : 'missing'
  if (state === 'missing') return <p>The reported item is no longer in the database. This report is kept.</p>
  const comment = objectField(target, 'comment')
  if (comment) {
    return (
      <>
        <p>Current comment: {state === 'deleted' ? 'Deleted. The text below is not current content.' : 'Available'}</p>
        <p className="report-text">{textField(comment, 'text') || 'No comment text is available.'}</p>
        <ParentPost post={objectField(target, 'post')} />
      </>
    )
  }
  const post = objectField(target, 'post')
  if (post && !comment) {
    return (
      <>
        <p>{state === 'deleted' ? 'This post is deleted. No current text is shown.' : 'Current post text'}</p>
        {textField(post, 'excerpt') ? <p className="report-text">{textField(post, 'excerpt')}</p> : <p>No current text is available.</p>}
        <p>Visibility: {textField(post, 'visibility') || 'Unknown'}</p>
      </>
    )
  }
  const request = objectField(target, 'workRequest')
  if (request) {
    return <p>Work request: {textField(request, 'title') || 'Untitled'} · {state === 'deleted' ? 'Deleted' : textField(request, 'status')}</p>
  }
  const account = objectField(target, 'user')
  if (account) {
    return <p>Account: {textField(account, 'displayName') || 'Unavailable'} · {state === 'deleted' ? 'Deleted' : textField(account, 'accountStatus')}</p>
  }
  const review = objectField(target, 'review')
  if (review) {
    const engagement = objectField(target, 'engagement')
    return (
      <>
        <p>{state === 'deleted' ? 'The engagement is deleted. Review text is not shown as current.' : 'Current review'}</p>
        {state === 'deleted' ? null : <p className="report-text">{textField(review, 'body') || 'No review text.'}</p>}
        <p>{engagement ? `Engagement: ${textField(engagement, 'title') || 'Untitled'}` : 'Engagement unavailable'}</p>
      </>
    )
  }
  const job = objectField(target, 'job')
  if (job) return <p>Job: {textField(job, 'title') || 'Untitled'} · {state === 'deleted' ? 'Deleted' : textField(job, 'status')}</p>
  const service = objectField(target, 'service')
  if (service) return <p>Service: {textField(service, 'title') || 'Untitled'} · {state === 'deleted' ? 'Deleted' : textField(service, 'status')}</p>
  return <p>Target state: {state}</p>
}

function ParentPost({ post }: { post: object | null }) {
  if (!post) return <p>The parent post is not available.</p>
  const excerpt = textField(post, 'excerpt')
  return (
    <p>
      Parent post: {'deleted' in post && post.deleted === true ? 'Deleted' : 'Available'}
      {excerpt ? ` · ${excerpt}` : ''}
    </p>
  )
}

function PersonLine({
  label,
  person,
  onOpen,
}: {
  label: string
  person: StaffReportDetail['reporter']
  onOpen: (id: string) => void
}) {
  if (!person) return <p>{label}: Unavailable</p>
  return (
    <p>
      {label}: {person.displayName}{' '}
      <span className="report-badge">{person.deleted ? 'Deleted' : person.accountStatus}</span>{' '}
      <button type="button" className="text-action" onClick={() => onOpen(person.id)}>View account</button>
    </p>
  )
}

function reportTitle(report: StaffReportDetail): string {
  const target = report.target
  const named = ['workRequest', 'job', 'service', 'engagement', 'user', 'post']
  for (const key of named) {
    const value = objectField(target, key)
    const title = value ? textField(value, 'title') || textField(value, 'displayName') || textField(value, 'excerpt') : ''
    if (title) return title
  }
  const comment = objectField(target, 'comment')
  const text = comment ? textField(comment, 'text') : ''
  return text ? text.slice(0, 80) : labelTarget(report.targetType)
}

function objectField(value: object, key: string): object | null {
  if (!(key in value)) return null
  const field = (value as Record<string, unknown>)[key]
  return field && typeof field === 'object' ? field : null
}

function textField(value: object, key: string): string {
  if (!(key in value)) return ''
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' ? field : ''
}

function nextActions(status: StaffReportDetail['status']): Array<StaffReportDetail['status']> {
  if (status === 'open') return ['resolved', 'dismissed']
  return ['open']
}

function labelTarget(value: string): string {
  return TARGETS.find((item) => item.id === value)?.label ?? value
}

function labelStatus(value: string): string {
  return STATUSES.find((item) => item.id === value)?.label ?? value
}

function labelReason(value: string): string {
  return value.replaceAll('_', ' ')
}

function labelAction(value: string): string {
  if (value === 'resolved' || value === 'report_resolved') return 'Resolve'
  if (value === 'dismissed' || value === 'report_dismissed') return 'Dismiss'
  if (value === 'open' || value === 'report_reopened') return 'Reopen'
  return value
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
