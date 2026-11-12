import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { AdminRecords, ReportStatusFilter, ReportTargetFilter, StaffReportDetail, StaffReportSummary } from './adminTypes'
import { moderationNotice, shouldRefreshModeration } from './contentModeration'
import { showRelatedReports } from './relatedReports'
import { ButtonSpinner, LoadingIndicator } from './LoadingIndicator'

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
  exactTarget,
  nextCursor,
  matchCount,
  phase,
  onFilter,
  onClearTarget,
  onReset,
  onOpen,
  onRelated,
  onMore,
}: {
  items: StaffReportSummary[]
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  exactTarget: { targetType: ReportTargetFilter; targetId: string } | null
  nextCursor: string | null
  matchCount: number | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onFilter: (statuses: ReportStatusFilter[], targetTypes: ReportTargetFilter[]) => void
  onClearTarget: () => void
  onReset: () => void
  onOpen: (id: string) => void
  onRelated: (targetType: ReportTargetFilter, targetId: string) => void
  onMore: () => void
}) {
  return (
    <div className="demo-list">
      <ReportFilters
        statuses={statuses}
        targetTypes={targetTypes}
        exactTarget={exactTarget}
        onFilter={onFilter}
        onClearTarget={onClearTarget}
        onReset={onReset}
      />
      <p>
        {phase === 'loading' ? <span className="metric-skeleton" aria-hidden="true" /> : matchCount === null ? 'Matching reports unavailable' : `Matching reports: ${matchCount}`}
      </p>
      <div className="report-results" aria-busy={phase === 'loading'}>
        {phase === 'loading' ? <LoadingIndicator compact label="Loading reports" /> : null}
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
              <TargetCounts counts={item.targetCounts} />
            </div>
            <div className="report-row-actions">
              <button type="button" className="report-open" onClick={() => onOpen(item.id)}>View report</button>
              {showRelatedReports(item.targetCounts) ? (
                <button type="button" className="report-related" onClick={() => onRelated(item.targetType, item.targetId)}>View related reports</button>
              ) : null}
            </div>
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
  exactTarget,
  onFilter,
  onClearTarget,
  onReset,
}: {
  statuses: ReportStatusFilter[]
  targetTypes: ReportTargetFilter[]
  exactTarget: { targetType: ReportTargetFilter; targetId: string } | null
  onFilter: (statuses: ReportStatusFilter[], targetTypes: ReportTargetFilter[]) => void
  onClearTarget: () => void
  onReset: () => void
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
        label="Statuses"
        summary={selectionSummary(statuses, STATUSES, 'All statuses', 'statuses')}
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
        label="Targets"
        summary={selectionSummary(targetTypes, TARGETS, 'All targets', 'targets')}
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
      <button type="button" className="report-clear" onClick={onReset}>Clear filters</button>
      <div className="report-chips">
        {statuses.map((status) => (
          <button key={status} type="button" className="report-chip" onClick={() => toggleStatus(status)}>
            {labelStatus(status)} <span aria-hidden="true">×</span><span className="sr-only">Remove status filter</span>
          </button>
        ))}
        {exactTarget ? (
          <button type="button" className="report-chip" onClick={onClearTarget}>
            This {labelTarget(exactTarget.targetType).toLowerCase()} <span aria-hidden="true">×</span><span className="sr-only">Remove target filter</span>
          </button>
        ) : null}
        {targetTypes.map((target) => (
          <button key={target} type="button" className="report-chip" onClick={() => toggleTarget(target)}>
            {labelTarget(target)} <span aria-hidden="true">×</span><span className="sr-only">Remove target filter</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterMenu({
  label,
  summary,
  open,
  onToggle,
  onDone,
  children,
}: {
  label: string
  summary: string
  open: boolean
  onToggle: () => void
  onDone: () => void
  children: ReactNode
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onDone()
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onDone])
  return (
    <div className="report-menu">
      <button
        ref={triggerRef}
        type="button"
        className="report-filter-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span>{summary}</span>
        <span className="report-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="report-menu-panel" id={panelId}>
          <div className="report-menu-options" role="group" aria-label={label}>
            {children}
          </div>
          <div className="report-menu-footer">
            <button type="button" className="secondary" onClick={() => { onDone(); triggerRef.current?.focus() }}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function selectionSummary<T extends string>(
  selected: T[],
  options: Array<{ id: T; label: string }>,
  allLabel: string,
  plural: string,
): string {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return options.find((item) => item.id === selected[0])?.label ?? allLabel
  return `${selected.length} ${plural}`
}

export function ReportDetail({
  report,
  records,
  onChanged,
  onOpenAccount,
  onRelated,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
  onOpenAccount: (id: string) => void
  onRelated: () => void
}) {
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<StaffReportDetail['status'] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const actions = nextActions(report.status)
  async function submit(status: StaffReportDetail['status']) {
    const text = note.trim()
    if (pending || text.length < 1 || text.length > 500) return
    setPending(status)
    setNotice(null)
    const result = await records.setReportStatus(report.id, { status, expectedStatus: report.status, note: text })
    setPending(null)
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
        <TargetCounts counts={report.targetCounts} />
        {showRelatedReports(report.targetCounts) ? (
          <div className="report-row-actions">
            <button type="button" className="report-related" onClick={onRelated}>View related reports</button>
          </div>
        ) : null}
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
      <ContentVisibility report={report} records={records} onChanged={onChanged} />
      <ReviewVisibility report={report} records={records} onChanged={onChanged} />
      <ListingVisibility report={report} records={records} onChanged={onChanged} />
      <section className="report-panel">
        <h2>Report actions</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="report-note">Moderation note</label>
          <textarea id="report-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          <div className="report-filters">
            {actions.map((action) => (
              <button key={action} type="button" disabled={pending !== null || note.trim().length < 1} aria-busy={pending === action} onClick={() => void submit(action)}>
                {pending === action ? <ButtonSpinner /> : null}
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

function ReviewVisibility({
  report,
  records,
  onChanged,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
}) {
  const moderation = report.contentModeration
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!moderation || moderation.kind !== 'review') return null
  const current = moderation
  const nextHidden = !current.hidden
  const label = current.hidden ? 'Restore review' : 'Hide review'
  const eligible = current.publicEligible
  async function submit() {
    const text = reason.trim()
    if (pending || !confirmed || text.length < 1 || text.length > 500) return
    setPending(true)
    setNotice(null)
    const result = await records.setContentVisibility('review', current.targetId, {
      hidden: nextHidden,
      expectedVersion: current.version,
      reason: text,
    })
    setPending(false)
    setNotice(moderationNotice(result))
    if (result.ok && result.data.outcome === 'changed') {
      setReason('')
      setConfirmed(false)
    }
    if (shouldRefreshModeration(result)) onChanged()
  }
  return (
    <section className="report-panel">
      <h2>Review visibility</h2>
      <p>{moderation.rating ?? '—'} stars · {moderation.direction === 'provider_to_client' ? 'Provider reviewed the client' : 'Client reviewed the provider'}</p>
      <p className="report-text">{moderation.body || 'No written review.'}</p>
      <p>Author: {moderation.author?.displayName ?? 'Unavailable'} · Reviewed person: {moderation.reviewedPerson?.displayName ?? 'Unavailable'}</p>
      {moderation.engagement ? <p>Engagement: {moderation.engagement.title}{moderation.engagement.deleted ? ' · Deleted' : ''}</p> : null}
      {moderation.service ? <p>Service: {moderation.service.title}</p> : null}
      <p>{moderation.hidden ? 'Hidden by Mawahib.' : 'Not hidden by staff.'} {moderation.deleted ? 'The engagement is deleted, so restoring the staff restriction does not publish the review.' : ''}</p>
      <p>Public eligible reviews in this direction: {eligible && eligible.count > 0 && eligible.average != null ? `${eligible.average.toFixed(1)} from ${eligible.count}` : 'No reviews yet'}</p>
      <p>Hidden from that public rating: {moderation.hiddenReviewCount ?? 0}</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="review-reason">Reason for this visibility change</label>
        <textarea id="review-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        <label className="content-confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{nextHidden
            ? 'I understand this removes the review from public views and rating calculations. The report, engagement, payments, and invoices stay unchanged.'
            : 'I understand this clears the staff restriction. The review is included again only if it is otherwise eligible. The report, engagement, payments, and invoices stay unchanged.'}</span>
        </label>
        <button type="button" disabled={pending || !confirmed || reason.trim().length < 1 || (moderation.deleted && nextHidden)} aria-busy={pending} onClick={() => void submit()}>
          {pending ? <ButtonSpinner /> : null}
          {label}
        </button>
      </form>
      {notice ? <p role="alert">{notice}</p> : null}
      <h3>Review history</h3>
      {moderation.history.length === 0 ? <p>No visibility changes yet.</p> : (
        <ol className="report-history">
          {moderation.history.map((event) => (
            <li key={event.id}>
              <p><strong>{labelAction(event.action)}</strong> · {event.actorLabel ?? 'Staff operator'} · {formatWhen(event.createdAt)}</p>
              {event.reason ? <p className="report-text">{event.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ListingVisibility({
  report,
  records,
  onChanged,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
}) {
  const moderation = report.contentModeration
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!moderation || (moderation.kind !== 'job' && moderation.kind !== 'service')) return null
  const current = moderation
  const nextHidden = !current.hidden
  const noun = current.kind === 'job' ? 'job' : 'service'
  const label = current.hidden ? `Restore ${noun}` : `Hide ${noun}`
  const owner = current.owner
  async function submit() {
    const text = reason.trim()
    if (pending || !confirmed || text.length < 1 || text.length > 500) return
    setPending(true)
    setNotice(null)
    const result = await records.setContentVisibility(current.kind, current.targetId, {
      hidden: nextHidden,
      expectedVersion: current.version,
      reason: text,
    })
    setPending(false)
    setNotice(moderationNotice(result))
    if (result.ok && result.data.outcome === 'changed') {
      setReason('')
      setConfirmed(false)
    }
    if (shouldRefreshModeration(result)) onChanged()
  }
  return (
    <section className="report-panel">
      <h2>{current.kind === 'job' ? 'Job visibility' : 'Service visibility'}</h2>
      <p>Listing: {current.title || 'Untitled'}</p>
      <p>Owner: {owner?.displayName ?? 'Unavailable'} · {owner?.deleted ? 'Deleted' : owner?.accountStatus ?? 'Unknown'}</p>
      <p>Business status: {(current.businessStatus ?? 'unknown').replaceAll('_', ' ')}</p>
      <p>Staff visibility: {current.hidden ? 'Hidden by Mawahib' : 'Not hidden'}</p>
      {current.deleted ? <p>This listing is deleted. Restoring the staff restriction does not bring it back.</p> : null}
      <p className="quiet-note">Hiding or restoring changes staff visibility only. It does not change the business status, existing applications, requests, engagements, payments, invoices, or this report.</p>
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="listing-reason">Reason for this visibility change</label>
        <textarea id="listing-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        <label className="content-confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{nextHidden
            ? `I understand this hides the ${noun} from public discovery and blocks new applications or requests. Existing applications, requests, and purchased work remain.`
            : `I understand this clears only the staff restriction. The ${noun} is public again only if its business status, deletion, and owner eligibility already allow it. Existing work remains.`}</span>
        </label>
        <button type="button" disabled={pending || !confirmed || reason.trim().length < 1 || (current.deleted && nextHidden)} aria-busy={pending} onClick={() => void submit()}>
          {pending ? <ButtonSpinner /> : null}
          {label}
        </button>
      </form>
      {notice ? <p role="alert">{notice}</p> : null}
      <h3>Moderation history</h3>
      {current.history.length === 0 ? <p>No visibility changes yet.</p> : (
        <ol className="report-history">
          {current.history.map((event) => (
            <li key={event.id}>
              <p><strong>{labelAction(event.action)}</strong> · {event.actorLabel ?? 'Staff operator'} · {formatWhen(event.createdAt)}</p>
              {event.reason ? <p className="report-text">{event.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ContentVisibility({
  report,
  records,
  onChanged,
}: {
  report: StaffReportDetail
  records: AdminRecords
  onChanged: () => void
}) {
  const moderation = report.contentModeration
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!moderation || (report.targetType !== 'post' && report.targetType !== 'post_comment')) return null
  const current = moderation
  const nextHidden = !current.hidden
  const label = current.hidden ? 'Restore content' : 'Hide content'
  async function submit() {
    const text = reason.trim()
    if (pending || !confirmed || text.length < 1 || text.length > 500) return
    setPending(true)
    setNotice(null)
    const result = await records.setContentVisibility(current.kind, current.targetId, {
      hidden: nextHidden,
      expectedVersion: current.version,
      reason: text,
    })
    setPending(false)
    setNotice(moderationNotice(result))
    if (result.ok && result.data.outcome === 'changed') {
      setReason('')
      setConfirmed(false)
    }
    if (shouldRefreshModeration(result)) onChanged()
  }
  return (
    <section className="report-panel">
      <h2>Content visibility</h2>
      <p>{current.hidden ? 'Hidden by Mawahib.' : 'Visible to people who can otherwise open it.'}</p>
      <p className="quiet-note">Hiding or restoring content does not resolve, dismiss, or reopen this report. Existing links and older notifications are not erased.</p>
      {current.deleted ? <p>The author has deleted this. Restoring visibility does not bring it back.</p> : null}
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="content-reason">Reason for this visibility change</label>
        <textarea id="content-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        <label className="content-confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>I confirm this visibility change and understand it does not change the report status.</span>
        </label>
        <button type="button" disabled={pending || !confirmed || reason.trim().length < 1 || (current.deleted && nextHidden)} aria-busy={pending} onClick={() => void submit()}>
          {pending ? <ButtonSpinner /> : null}
          {label}
        </button>
      </form>
      {notice ? <p role="alert">{notice}</p> : null}
      <h3>Content history</h3>
      {current.history.length === 0 ? <p>No visibility changes yet.</p> : (
        <ol className="report-history">
          {current.history.map((event) => (
            <li key={event.id}>
              <p><strong>{labelAction(event.action)}</strong> · {event.actorLabel ?? 'Staff operator'} · {formatWhen(event.createdAt)}</p>
              {event.reason ? <p className="report-text">{event.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
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
  if (job) {
    return (
      <>
        <p>Job: {textField(job, 'title') || 'Untitled'} · Business status: {state === 'deleted' ? 'Deleted' : textField(job, 'status')}</p>
        <p>Staff visibility: {flagField(job, 'staffHidden') ? 'Hidden by Mawahib' : 'Not hidden'}</p>
      </>
    )
  }
  const service = objectField(target, 'service')
  if (service) {
    return (
      <>
        <p>Service: {textField(service, 'title') || 'Untitled'} · Business status: {state === 'deleted' ? 'Deleted' : textField(service, 'status')}</p>
        <p>Staff visibility: {flagField(service, 'staffHidden') ? 'Hidden by Mawahib' : 'Not hidden'}</p>
      </>
    )
  }
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

function TargetCounts({ counts }: { counts: StaffReportSummary['targetCounts'] }) {
  if (!counts) return <p>Report counts unavailable</p>
  return (
    <p>
      {counts.openReportCount} open · {counts.totalReportCount} total · {counts.uniqueReporterCount} unique reporters, all statuses
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

function flagField(value: object, key: string): boolean {
  if (!(key in value)) return false
  return (value as Record<string, unknown>)[key] === true
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
  if (value === 'post_hidden' || value === 'comment_hidden' || value === 'review_hidden') return 'Hide content'
  if (value === 'post_restored' || value === 'comment_restored' || value === 'review_restored') return 'Restore content'
  if (value === 'job_hidden') return 'Hide job'
  if (value === 'job_restored') return 'Restore job'
  if (value === 'service_hidden') return 'Hide service'
  if (value === 'service_restored') return 'Restore service'
  return value
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
