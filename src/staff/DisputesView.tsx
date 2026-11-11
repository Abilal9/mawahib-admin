import { useRef, useState, type FormEvent } from 'react'
import type {
  DisputeCaseDetail,
  DisputeCaseListItem,
  DisputeCaseOutcome,
  DisputeCaseQuery,
  DisputeCaseStatus,
  DisputeResolutionAction,
  DisputeResolutionOption,
} from './adminTypes'
import { LoadingIndicator } from './LoadingIndicator'

const STATUSES: DisputeCaseStatus[] = ['open', 'in_review', 'closed']
const ASSIGNMENTS = ['unassigned', 'mine', 'others'] as const
const ENGAGEMENT = ['disputed', 'not_disputed'] as const
const OUTCOMES: DisputeCaseOutcome[] = ['parties_resolved', 'no_staff_action', 'payment_follow_up', 'invalid_or_duplicate', 'other']
const RESOLUTION_ACTIONS: DisputeResolutionAction[] = ['return_to_client_review', 'further_work', 'follow_up']

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_review: 'In review', closed: 'Closed' }
const ASSIGNMENT_LABEL: Record<string, string> = { unassigned: 'Unassigned', mine: 'Assigned to me', others: 'Assigned to another operator' }
const ENGAGEMENT_LABEL: Record<string, string> = { disputed: 'Currently disputed', not_disputed: 'Not currently disputed' }
const OUTCOME_LABEL: Record<string, string> = {
  parties_resolved: 'Parties resolved it',
  no_staff_action: 'No staff action needed',
  payment_follow_up: 'Payment follow-up',
  invalid_or_duplicate: 'Invalid or duplicate',
  other: 'Other',
  returned_for_client_review: 'Returned to client review',
  further_work_agreed: 'Further work agreed',
}
const RESOLUTION_COPY: Record<DisputeResolutionAction, { title: string; button: string; confirm: string }> = {
  return_to_client_review: {
    title: 'Return to client review',
    button: 'Return to client review',
    confirm: 'I understand this returns the engagement to Delivered for the client to review. It does not accept the work, collect payment, release funds, or create an invoice.',
  },
  further_work: {
    title: 'Further work agreed',
    button: 'Record further work',
    confirm: 'I understand this returns the engagement to In progress so the provider can continue and deliver again. Payments, invoices, and earlier deliveries stay as they are. This records an agreement I have already established.',
  },
  follow_up: {
    title: 'Follow-up still required',
    button: 'Record follow-up',
    confirm: 'I understand this keeps the engagement Disputed and does not close the case. It is not a completed resolution.',
  },
}

export function DisputeCaseList({
  query,
  items,
  nextCursor,
  total,
  matchCount,
  phase,
  onChange,
  onOpen,
  onOpenUser,
}: {
  query: DisputeCaseQuery
  items: DisputeCaseListItem[]
  nextCursor: string | null
  total: number | null
  matchCount: number | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onChange: (next: DisputeCaseQuery) => void
  onOpen: (id: string) => void
  onOpenUser: (id: string) => void
}) {
  const [draft, setDraft] = useState(query.q)
  function toggle<T extends string>(group: 'statuses' | 'assignment' | 'engagementState', id: T) {
    const current = query[group] as T[]
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    onChange({ ...query, [group]: next, cursor: null })
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    onChange({ ...query, q: draft.trim(), cursor: null })
  }
  return (
    <div className="demo-list">
      <form className="market-search" onSubmit={submit}>
        <label>
          Search
          <input value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button type="submit">Search</button>
      </form>
      <div className="report-filter-bar">
        <FilterChoices label="Handling status" options={STATUSES} selected={query.statuses} labels={STATUS_LABEL} onToggle={(id) => toggle('statuses', id)} />
        <FilterChoices label="Assignment" options={[...ASSIGNMENTS]} selected={query.assignment} labels={ASSIGNMENT_LABEL} onToggle={(id) => toggle('assignment', id)} />
        <FilterChoices label="Engagement" options={[...ENGAGEMENT]} selected={query.engagementState} labels={ENGAGEMENT_LABEL} onToggle={(id) => toggle('engagementState', id)} />
        <button type="button" className="report-clear" onClick={() => onChange({ ...query, statuses: [], assignment: [], engagementState: [], cursor: null })}>Clear filters</button>
      </div>
      <div className="report-chips">
        {[...query.statuses, ...query.assignment, ...query.engagementState].map((token) => (
          <button key={token} type="button" className="report-chip" onClick={() => {
            if (query.statuses.includes(token as DisputeCaseStatus)) toggle('statuses', token as DisputeCaseStatus)
            else if ((ASSIGNMENTS as readonly string[]).includes(token)) toggle('assignment', token as typeof ASSIGNMENTS[number])
            else toggle('engagementState', token as typeof ENGAGEMENT[number])
          }}>{STATUS_LABEL[token] ?? ASSIGNMENT_LABEL[token] ?? ENGAGEMENT_LABEL[token]} <span aria-hidden="true">×</span></button>
        ))}
      </div>
      <p>{phase === 'loading' ? <span className="metric-skeleton" aria-hidden="true" /> : matchCount === null || total === null ? 'Matching cases unavailable' : `${matchCount} of ${total}`}</p>
      <div aria-busy={phase === 'loading'}>
        {phase === 'loading' ? <LoadingIndicator compact label="Loading dispute cases" /> : null}
        {phase === 'unavailable' ? <p role="alert">Dispute cases are temporarily unavailable. The filters are unchanged.</p> : null}
        {phase === 'denied' ? <p role="alert">Staff access is not active for this account.</p> : null}
        {phase === 'expired' ? <p role="alert">Your session has expired. Sign in again.</p> : null}
        {phase === 'ready' && items.length === 0 ? <p>No dispute cases match these filters.</p> : null}
        {phase === 'ready' ? items.map((item) => (
          <article key={item.id} className="demo-row">
            <div>
              <p><strong>{item.engagement.title}</strong> <span className="status-badge">{STATUS_LABEL[item.status]}</span></p>
              <p>Client: {person(item.client, onOpenUser)} · Provider: {person(item.provider, onOpenUser)}</p>
              <p>{item.assignee ? `${item.assignee.isSelf ? 'Assigned to me' : `Assigned to ${item.assignee.label}`}${item.assignee.membershipStatus && item.assignee.membershipStatus !== 'active' ? ' (no longer active)' : ''}` : 'Unassigned'}</p>
              <p>{item.reason ?? 'No dispute reason is recorded.'}</p>
              <p>Opened {new Date(item.openedAt).toLocaleString()}{item.engagementStillDisputed ? ' · Engagement is still disputed' : ''}</p>
            </div>
            <button type="button" className="text-action" onClick={() => onOpen(item.id)}>View case</button>
          </article>
        )) : null}
        {phase === 'ready' && nextCursor ? <button type="button" onClick={() => onChange({ ...query, cursor: nextCursor })}>Next</button> : null}
      </div>
    </div>
  )
}

export function DisputeCaseDetailView({
  record,
  phase,
  notice,
  onOpenUser,
  onViewInvoice,
  onStartReview,
  onClose,
  onReopen,
  onAssign,
  onUnassign,
  onNote,
  onResolve,
  onRefresh,
  assignees,
}: {
  record: DisputeCaseDetail | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired' | 'missing' | 'conflict'
  notice: string | null
  onOpenUser: (id: string) => void
  onViewInvoice: (id: string) => Promise<{ url: string; originalFileName: string } | null>
  onStartReview: (note: string, key: string) => Promise<ActionResult>
  onClose: (outcome: DisputeCaseOutcome, note: string, key: string) => Promise<ActionResult>
  onReopen: (note: string, key: string) => Promise<ActionResult>
  onAssign: (staffMemberId: string, note: string, key: string) => Promise<ActionResult>
  onUnassign: (note: string, key: string) => Promise<ActionResult>
  onNote: (body: string, key: string) => Promise<ActionResult>
  onResolve: (action: DisputeResolutionAction, note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
  assignees: Array<{ staffMemberId: string; label: string; isSelf: boolean; conflicted: boolean }>
}) {
  if (phase === 'loading') return <LoadingIndicator compact label="Loading dispute case" />
  if (phase === 'unavailable') return <p role="alert">This dispute case is temporarily unavailable.</p>
  if (phase === 'denied') return <p role="alert">Staff access is not active for this account.</p>
  if (phase === 'expired') return <p role="alert">Your session has expired. Sign in again.</p>
  if (phase === 'missing' || !record) return <p role="alert">That dispute case is not available.</p>
  const assignee = record.assignment.assignee
  return (
    <div className="demo-list">
      {notice ? <p role="alert">{notice}</p> : null}
      <section className="demo-panel">
        <h2>Case summary</h2>
        <p>Handling status: {STATUS_LABEL[record.case.status]}</p>
        <p>Engagement status: {label(record.engagement.status)}</p>
        {record.case.status === 'closed' && record.case.engagementStillDisputed ? <p>Case closed. The engagement is still disputed.</p> : null}
        {record.case.closedOutcome ? <p>Outcome: {OUTCOME_LABEL[record.case.closedOutcome]}</p> : null}
        {record.case.closedNote ? <p>{record.case.closedNote}</p> : null}
        {record.businessDisputeEnded ? <p>{businessEndSentence(record.businessDisputeEnded)}</p> : null}
      </section>
      <section className="demo-panel">
        <h2>Participants</h2>
        <p>Client: {person(record.client, onOpenUser)}</p>
        <p>Provider: {person(record.provider, onOpenUser)}</p>
      </section>
      <section className="demo-panel">
        <h2>Engagement</h2>
        <p>{record.engagement.title}</p>
        <p>Current business status: {label(record.engagement.status)}{record.engagement.deleted ? ' · Deleted' : ''}</p>
        {record.related.job ? <p>Job: {record.related.job.title} · {label(record.related.job.status)}</p> : null}
        {record.related.service ? <p>Service: {record.related.service.title} · {label(record.related.service.status)}</p> : null}
        {record.related.application ? <p>Application: {label(record.related.application.status)}</p> : null}
      </section>
      <section className="demo-panel">
        <h2>Dispute reason</h2>
        <p>{record.dispute.reason ?? 'No dispute reason is recorded.'}</p>
        <h3>Engagement status history</h3>
        {record.engagementHistory.map((event) => (
          <p key={event.id}>{event.fromStatus ? `${label(event.fromStatus)} → ` : ''}{label(event.toStatus)} · {event.by} · {new Date(event.at).toLocaleString()}{event.note ? ` · ${event.note}` : ''}</p>
        ))}
      </section>
      <section className="demo-panel">
        <h2>Payments and invoices</h2>
        {record.payments.length === 0 ? <p>No payment is recorded.</p> : record.payments.map((payment) => (
          <article key={payment.id}>
            <p>Payment {payment.amount} {payment.currency} · {label(payment.status)}</p>
            {payment.simulated ? <p>Simulated — no real payment</p> : null}
            {payment.invoice ? (
              <>
                <p>Invoice {payment.invoice.invoiceNumber} · {payment.invoice.total} {payment.invoice.currency} · {label(payment.invoice.status)}</p>
                {payment.invoice.simulated ? <p>Simulated — no real payment</p> : null}
                {payment.invoice.documentAvailable ? <button type="button" onClick={() => void openInvoice(payment.invoice!.id, onViewInvoice)}>View invoice</button> : null}
              </>
            ) : <p>No invoice issued</p>}
          </article>
        ))}
      </section>
      <section className="demo-panel case-form">
        <h2>Assignment</h2>
        <p>{assignee ? `${assignee.label}${assignee.membershipStatus !== 'active' ? ' (no longer active)' : ''}${assignee.isSelf ? ' · Assigned to me' : ''}` : 'Unassigned'}</p>
        {record.viewer.canAct && !record.viewer.allowedActions.some((action) => action === 'start_review' || action === 'note' || action === 'close' || action === 'reopen') ? (
          <p>{record.assignment.assignee ? `Assigned to ${record.assignment.assignee.label}${record.assignment.assignee.membershipStatus !== 'active' ? ', who is no longer active' : ''}. Only the assigned reviewer can handle this case.` : 'Assign this case to a reviewer before handling it.'}</p>
        ) : null}
        {record.viewer.canAct ? <AssignmentForm record={record} assignees={assignees} onAssign={onAssign} onUnassign={onUnassign} onRefresh={onRefresh} /> : null}
      </section>
      <section className="demo-panel case-form">
        <h2>Review</h2>
        <p>Handling status: {STATUS_LABEL[record.case.status]}</p>
        {record.viewer.allowedActions.includes('start_review') ? <ReviewForm onStartReview={onStartReview} onRefresh={onRefresh} /> : null}
        {record.viewer.allowedActions.includes('reopen') ? <ReopenForm onReopen={onReopen} onRefresh={onRefresh} /> : null}
      </section>
      <section className="demo-panel case-form">
        <h2>Internal notes</h2>
        {record.notes.length === 0 ? <p>No internal notes yet.</p> : record.notes.map((note) => (
          <p key={note.id}>{note.kind === 'follow_up' ? 'Follow-up · ' : ''}{note.author.label} · {new Date(note.createdAt).toLocaleString()} · {note.body}</p>
        ))}
        {record.viewer.allowedActions.includes('note') ? <NoteForm onNote={onNote} onRefresh={onRefresh} /> : null}
      </section>
      {handlesCase(record) ? (
        <section className="demo-panel case-form">
          <h2>Business resolution</h2>
          <p className="section-note">These choices change the engagement only through a validated transition. Payments and invoices stay as they are.</p>
          <p>Current engagement status: {label(record.engagement.status)}</p>
          {RESOLUTION_ACTIONS.map((action) => {
            const choice = resolutionChoice(record, action)
            return choice.available
              ? <ResolutionForm key={action} action={action} onResolve={onResolve} onRefresh={onRefresh} />
              : choice.reason ? <p key={action}>{RESOLUTION_COPY[action].title}: {choice.reason}</p> : null
          })}
        </section>
      ) : null}
      {record.viewer.canAct && record.viewer.allowedActions.includes('close') ? (
        <section className="demo-panel case-form">
          <h2>Administrative closure</h2>
          <p className="section-note">Closing this case does not change the engagement status, restore an earlier status, or change any payment.</p>
          <CloseForm onClose={onClose} onRefresh={onRefresh} />
        </section>
      ) : null}
      <section className="demo-panel">
        <h2>History</h2>
        {record.history.length === 0 ? <p>No staff actions yet.</p> : record.history.map((event) => (
          <p key={event.id}>{actionLabel(event.action)} · {event.actor.label} · {new Date(event.createdAt).toLocaleString()} · {label(event.previousStatus)} → {label(event.resultingStatus)}{event.engagementStatusAtAction ? ` · Engagement ${label(event.engagementStatusAtAction)} → ${label(event.engagementResultingStatus ?? event.engagementStatusAtAction)}` : ''} · {event.reason}</p>
        ))}
      </section>
      {record.viewer.canAct ? null : <p>You are linked to a participant in this engagement.</p>}
    </div>
  )
}

type ActionResult = 'ok' | 'uncertain' | 'conflict' | 'rejected'

function useBoundRequestKey() {
  const bound = useRef<{ content: string; key: string } | null>(null)
  return {
    keyFor(content: string) {
      if (!bound.current || bound.current.content !== content) {
        bound.current = { content, key: crypto.randomUUID() }
      }
      return bound.current.key
    },
    release() {
      bound.current = null
    },
  }
}

function finishStaffAction(
  result: ActionResult,
  keys: { release: () => void },
  setConflict: (value: boolean) => void,
  setMessage: (value: string | null) => void,
  uncertain: string,
  rejected: string,
  onSuccess: () => void,
) {
  if (result === 'conflict') {
    keys.release()
    setConflict(true)
    setMessage('This case changed. Refresh the case before trying again.')
    return
  }
  setConflict(false)
  if (result === 'uncertain') {
    setMessage(uncertain)
    return
  }
  keys.release()
  if (result === 'ok') {
    onSuccess()
    return
  }
  setMessage(rejected)
}

function ActionFeedback({
  message,
  conflict,
  onRefresh,
}: {
  message: string | null
  conflict: boolean
  onRefresh: () => Promise<void>
}) {
  if (!message && !conflict) return null
  return (
    <>
      {message ? <p role="alert">{message}</p> : null}
      {conflict ? <button type="button" className="secondary" onClick={() => void onRefresh()}>Refresh case</button> : null}
    </>
  )
}

function AssignmentForm({ record, assignees, onAssign, onUnassign, onRefresh }: {
  record: DisputeCaseDetail
  assignees: Array<{ staffMemberId: string; label: string; isSelf: boolean; conflicted: boolean }>
  onAssign: (staffMemberId: string, note: string, key: string) => Promise<ActionResult>
  onUnassign: (note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const [choice, setChoice] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const keys = useBoundRequestKey()
  const me = assignees.find((item) => item.isSelf && !item.conflicted)
  async function submit(content: string, run: (key: string) => Promise<ActionResult>) {
    if (!reason.trim()) {
      setMessage('A reason is required for this assignment.')
      setConflict(false)
      return
    }
    const result = await run(keys.keyFor(content))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'That assignment was not saved.', () => {
      setReason('')
      setMessage(null)
    })
  }
  return (
    <>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <label>Operator
        <select value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="">Choose an operator</option>
          {assignees.filter((item) => !item.conflicted).map((item) => (
            <option key={item.staffMemberId} value={item.staffMemberId}>{item.label}{item.isSelf ? ' (you)' : ''}</option>
          ))}
        </select>
      </label>
      <label>Reason for this assignment
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <div className="actions">
        {me ? <button type="button" className="secondary" onClick={() => void submit(`assign:${me.staffMemberId}:${reason}`, (key) => onAssign(me.staffMemberId, reason, key))}>Assign to me</button> : null}
        <button type="button" disabled={!choice} onClick={() => void submit(`assign:${choice}:${reason}`, (key) => onAssign(choice, reason, key))}>{record.assignment.assignee ? 'Reassign' : 'Assign'}</button>
        {record.viewer.allowedActions.includes('unassign') ? <button type="button" className="secondary" onClick={() => void submit(`unassign:${reason}`, (key) => onUnassign(reason, key))}>Unassign</button> : null}
      </div>
    </>
  )
}

function ReviewForm({ onStartReview, onRefresh }: {
  onStartReview: (note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const keys = useBoundRequestKey()
  async function submit() {
    if (!note.trim()) {
      setMessage('A note is required to start review.')
      setConflict(false)
      return
    }
    const result = await onStartReview(note, keys.keyFor(`review:${note}`))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'Review was not started.', () => {
      setNote('')
      setMessage(null)
    })
  }
  return (
    <>
      <p className="section-note">A review note is required. Assignment does not happen when this action is used.</p>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <label>Review note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="actions">
        <button type="button" onClick={() => void submit()}>Start review</button>
      </div>
    </>
  )
}

function NoteForm({ onNote, onRefresh }: {
  onNote: (body: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const keys = useBoundRequestKey()
  async function submit() {
    if (!body.trim()) {
      setMessage('Write the note before adding it.')
      setConflict(false)
      return
    }
    const result = await onNote(body, keys.keyFor(`note:${body}`))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'The note was not saved.', () => {
      setBody('')
      setMessage(null)
    })
  }
  return (
    <>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <label>Internal note
        <textarea value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <div className="actions">
        <button type="button" onClick={() => void submit()}>Add note</button>
      </div>
    </>
  )
}

function CloseForm({ onClose, onRefresh }: {
  onClose: (outcome: DisputeCaseOutcome, note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const [outcome, setOutcome] = useState<DisputeCaseOutcome>('no_staff_action')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const keys = useBoundRequestKey()
  async function submit() {
    if (!note.trim()) {
      setMessage('A closing note is required.')
      setConflict(false)
      return
    }
    if (!confirmed) {
      setMessage('Confirm that closing the case leaves the engagement and payments unchanged.')
      setConflict(false)
      return
    }
    const result = await onClose(outcome, note, keys.keyFor(`close:${outcome}:${note}`))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'The case was not closed.', () => {
      setNote('')
      setConfirmed(false)
      setMessage(null)
    })
  }
  return (
    <>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <label>Outcome
        <select value={outcome} onChange={(event) => setOutcome(event.target.value as DisputeCaseOutcome)}>
          {OUTCOMES.map((item) => <option key={item} value={item}>{OUTCOME_LABEL[item]}</option>)}
        </select>
      </label>
      <label>Closing note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <label className="confirm-line">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        I understand this does not change the engagement status or any payment.
      </label>
      <div className="actions">
        <button type="button" onClick={() => void submit()}>Close case</button>
      </div>
    </>
  )
}

function ReopenForm({ onReopen, onRefresh }: {
  onReopen: (note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const keys = useBoundRequestKey()
  async function submit() {
    if (!note.trim()) {
      setMessage('A reason is required to reopen the case.')
      setConflict(false)
      return
    }
    const result = await onReopen(note, keys.keyFor(`reopen:${note}`))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'The case was not reopened.', () => {
      setNote('')
      setMessage(null)
    })
  }
  return (
    <>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <p className="section-note">Reopening this case does not put the engagement back into dispute or undo a previous resolution.</p>
      <label>Reason to reopen
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => void submit()}>Reopen case</button>
      </div>
    </>
  )
}

function ResolutionForm({ action, onResolve, onRefresh }: {
  action: DisputeResolutionAction
  onResolve: (action: DisputeResolutionAction, note: string, key: string) => Promise<ActionResult>
  onRefresh: () => Promise<void>
}) {
  const copy = RESOLUTION_COPY[action]
  const keys = useBoundRequestKey()
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  async function submit() {
    if (!note.trim()) {
      setMessage('An explanatory note is required.')
      setConflict(false)
      return
    }
    if (!confirmed) {
      setMessage(copy.confirm)
      setConflict(false)
      return
    }
    const result = await onResolve(action, note, keys.keyFor(`${action}:${note}`))
    finishStaffAction(result, keys, setConflict, setMessage, 'The result is uncertain. Try the action again when you are ready.', 'That resolution was not saved.', () => {
      setNote('')
      setConfirmed(false)
      setMessage(null)
    })
  }
  return (
    <div>
      <h3>{copy.title}</h3>
      <ActionFeedback message={message} conflict={conflict} onRefresh={async () => { setConflict(false); setMessage(null); await onRefresh() }} />
      <label>{copy.title} note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <label className="confirm-line">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        {copy.confirm}
      </label>
      <div className="actions">
        <button type="button" onClick={() => void submit()}>{copy.button}</button>
      </div>
    </div>
  )
}

function handlesCase(record: DisputeCaseDetail) {
  return record.viewer.allowedActions.some((action) => action === 'start_review' || action === 'note' || action === 'close' || action === 'reopen' || action === 'return_to_client_review' || action === 'further_work' || action === 'follow_up')
}

function resolutionChoice(record: DisputeCaseDetail, action: DisputeResolutionAction): DisputeResolutionOption {
  return record.resolutions?.[action] ?? {
    available: record.viewer.allowedActions.includes(action),
    reason: null,
  }
}

function businessEndSentence(end: NonNullable<DisputeCaseDetail['businessDisputeEnded']>) {
  const when = new Date(end.at).toLocaleString()
  const status = label(end.toStatus)
  if (end.kind === 'staff_resolution') {
    return `${end.actorLabel ?? 'A staff operator'} moved this engagement to ${status} on ${when} and closed this case.`
  }
  if (end.kind === 'participant' && end.by) {
    return `The ${end.by} marked the engagement ${status} on ${when}. This did not change the staff case.`
  }
  return `The engagement moved to ${status} on ${when}. This did not change the staff case.`
}

function actionLabel(value: string) {
  if (value === 'returned_for_client_review') return 'Returned to client review'
  if (value === 'further_work_agreed') return 'Further work agreed'
  if (value === 'follow_up_recorded') return 'Follow-up recorded'
  if (value === 'closed') return 'Case closed'
  return label(value)
}

function FilterChoices<T extends string>({ label, options, selected, labels, onToggle }: {
  label: string
  options: T[]
  selected: T[]
  labels: Record<string, string>
  onToggle: (id: T) => void
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
          {labels[option]}
        </label>
      ))}
    </fieldset>
  )
}

function person(party: { id: string; displayName: string; deleted: boolean } | null, onOpen: (id: string) => void) {
  if (!party) return 'Unavailable'
  return <button type="button" onClick={() => onOpen(party.id)}>{party.displayName}{party.deleted ? ' (deleted)' : ''}</button>
}

function label(value: string) {
  return value.replaceAll('_', ' ')
}

async function openInvoice(id: string, onViewInvoice: (id: string) => Promise<{ url: string; originalFileName: string } | null>) {
  const file = await onViewInvoice(id)
  if (!file) return
  const link = document.createElement('a')
  link.href = file.url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.click()
}
