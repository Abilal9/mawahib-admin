import { useState } from 'react'
import type { AdminRecords, ReportListQuery, StaffReportDetail, StaffReportSummary } from './adminTypes'

const STATUSES: Array<{ id: ReportListQuery['status']; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
]

const TARGETS: Array<{ id: ReportListQuery['targetType']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'post_comment', label: 'Comment' },
  { id: 'work_request', label: 'Work request' },
  { id: 'user', label: 'Account' },
  { id: 'post', label: 'Post' },
  { id: 'engagement_review', label: 'Review' },
  { id: 'job_listing', label: 'Job' },
  { id: 'service_offering', label: 'Service' },
]

export function ReportsList({
  items,
  status,
  targetType,
  nextCursor,
  onFilter,
  onOpen,
  onMore,
}: {
  items: StaffReportSummary[]
  status: ReportListQuery['status']
  targetType: ReportListQuery['targetType']
  nextCursor: string | null
  onFilter: (status: ReportListQuery['status'], targetType: ReportListQuery['targetType']) => void
  onOpen: (id: string) => void
  onMore: () => void
}) {
  return (
    <div className="demo-list">
      <div className="report-filters" role="group" aria-label="Report status">
        {STATUSES.map((item) => (
          <button key={item.id} type="button" aria-pressed={status === item.id} onClick={() => onFilter(item.id, targetType)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="report-filters" role="group" aria-label="Report target">
        {TARGETS.map((item) => (
          <button key={item.id} type="button" aria-pressed={targetType === item.id} onClick={() => onFilter(status, item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? <p>No reports match these filters.</p> : null}
      {items.map((item) => (
        <article key={item.id} className="demo-row">
          <div>
            <p><strong>{labelTarget(item.targetType)}</strong> · {labelReason(item.reason)}</p>
            <p>{item.status} · {formatWhen(item.createdAt)}</p>
            <p>Reported account: {item.reportedUser ? item.reportedUser.displayName : 'Unavailable'}</p>
          </div>
          <button type="button" className="text-action" onClick={() => onOpen(item.id)}>View report</button>
        </article>
      ))}
      {nextCursor ? <button type="button" onClick={onMore}>Next</button> : null}
    </div>
  )
}

export function ReportDetail({
  report,
  records,
  onChanged,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
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
    <section className="demo-panel">
      <p>Status: {report.status}</p>
      <p>Reason: {labelReason(report.reason)}</p>
      <p>Submitted {formatWhen(report.createdAt)}</p>
      <p>Details: {report.details ?? 'No details were added.'}</p>
      <p>Reporter: {report.reporter ? `${report.reporter.displayName} · ${report.reporter.accountStatus}` : 'Reporter record unavailable'}</p>
      <p>Reported account: {report.reportedUser ? `${report.reportedUser.displayName} · ${report.reportedUser.accountStatus}` : 'Unavailable'}</p>
      <TargetContext target={report.target} />
      <h2>History</h2>
      {report.history.length === 0 ? <p>No status changes yet.</p> : report.history.map((event) => (
        <p key={event.id}>{labelAction(event.action)} · {formatWhen(event.createdAt)}{event.note ? ` · ${event.note}` : ''}</p>
      ))}
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="report-note">Note</label>
        <textarea id="report-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
        <div className="report-filters">
          {actions.map((action) => (
            <button key={action} type="button" disabled={busy || note.trim().length < 1} onClick={() => void submit(action)}>
              {labelAction(action)}
            </button>
          ))}
        </div>
      </form>
      {notice ? <p role="alert">{notice}</p> : null}
      <p className="quiet-note">Changing this report does not hide content or change an account.</p>
    </section>
  )
}

function TargetContext({ target }: { target: StaffReportDetail['target'] }) {
  const state = typeof target.state === 'string' ? target.state : 'missing'
  if (state === 'missing') return <p>The reported item is no longer in the database.</p>
  const comment = target.comment
  if (comment && typeof comment === 'object') {
    const text = 'text' in comment && typeof comment.text === 'string' ? comment.text : ''
    return (
      <>
        <p>Comment: {state === 'deleted' ? 'Deleted' : 'Available'}</p>
        <p>{text}</p>
      </>
    )
  }
  const request = target.workRequest
  if (request && typeof request === 'object') {
    const title = textField(request, 'title') || 'Untitled'
    const status = textField(request, 'status') || state
    return <p>Work request: {title} · {status}{state === 'deleted' ? ' · Deleted' : ''}</p>
  }
  const post = target.post
  if (post && typeof post === 'object') {
    const excerpt = textField(post, 'excerpt')
    return (
      <>
        <p>Post: {state === 'deleted' ? 'Deleted. This is not the current post.' : 'Available'}</p>
        {excerpt ? <p>{excerpt}</p> : <p>No current text is available.</p>}
      </>
    )
  }
  const account = target.user
  if (account && typeof account === 'object') {
    return <p>Account: {textField(account, 'displayName') || 'Unavailable'} · {state === 'deleted' ? 'Deleted' : textField(account, 'accountStatus') || state}</p>
  }
  const review = target.review
  if (review && typeof review === 'object') {
    const body = textField(review, 'body')
    const title = target.engagement && typeof target.engagement === 'object' ? textField(target.engagement, 'title') : ''
    return (
      <>
        <p>Review: {state === 'deleted' ? 'Deleted. This is not the current review.' : 'Available'}{title ? ` · ${title}` : ''}</p>
        {body ? <p>{body}</p> : <p>No current review text is available.</p>}
      </>
    )
  }
  const job = target.job
  if (job && typeof job === 'object') {
    return <p>Job: {textField(job, 'title') || 'Untitled'}{state === 'deleted' ? ' · Deleted' : ` · ${textField(job, 'status')}`}</p>
  }
  const service = target.service
  if (service && typeof service === 'object') {
    return <p>Service: {textField(service, 'title') || 'Untitled'}{state === 'deleted' ? ' · Deleted' : ` · ${textField(service, 'status')}`}</p>
  }
  return <p>Target state: {state}</p>
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
