import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { StaffAuditItem, StaffAuditPage, StaffDirectoryPage, StaffQuery } from './adminTypes'
import { LoadingIndicator } from './LoadingIndicator'

const GROUPS = [
  { id: 'membership', label: 'Membership' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'work', label: 'Work' },
] as const

const TARGET_LABELS: Record<string, string> = {
  account: 'Account',
  report: 'Report',
  post: 'Post',
  comment: 'Comment',
  review: 'Review',
  job: 'Job',
  service: 'Service',
  invoice: 'Invoice',
  engagement: 'Engagement',
  staff_membership: 'Staff membership',
}

export function StaffView({
  query,
  directory,
  audit,
  phase,
  onChange,
  onOpenAccount,
  onOpenReport,
  onOpenJob,
  onOpenService,
  onOpenEngagement,
}: {
  query: StaffQuery
  directory: StaffDirectoryPage | null
  audit: StaffAuditPage | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onChange: (next: StaffQuery) => void
  onOpenAccount: (id: string) => void
  onOpenReport: (id: string) => void
  onOpenJob: (id: string) => void
  onOpenService: (id: string) => void
  onOpenEngagement: (id: string) => void
}) {
  const searchId = useId()
  const [draft, setDraft] = useState(query.q)
  useEffect(() => { setDraft(query.q) }, [query.q])
  if (phase === 'denied') return <p role="alert">Staff access is not active for this account.</p>
  if (phase === 'expired') return <p role="alert">Your session has expired. Sign in again.</p>

  function toggleGroup(id: string) {
    const groups = query.groups.includes(id) ? query.groups.filter((item) => item !== id) : [...query.groups, id]
    onChange({ ...query, groups, cursor: null })
  }

  return (
    <div className="staff-page">
      <p className="section-note">Invitation and membership changes stay on operator commands. This screen does not invite, activate, or hold credentials.</p>
      <section aria-labelledby="staff-directory-title" aria-busy={phase === 'loading'}>
        <h2 id="staff-directory-title">Staff directory</h2>
        <p className="section-note">Invited email is the address recorded with the invitation. It is not a live check of the current sign-in email.</p>
        {phase === 'loading' ? <LoadingIndicator compact label="Loading staff directory" /> : null}
        {phase === 'ready' && !directory ? <p role="alert">The staff directory is unavailable.</p> : null}
        {directory ? (
          <>
            <p>Staff memberships: {directory.total}</p>
            {directory.items.length === 0 ? <p>No staff memberships are on file.</p> : null}
            <div className="records">
              {directory.items.map((member) => (
                <article key={member.id} className="record">
                  <h3>{member.invitedEmail ?? 'No invited email recorded'}</h3>
                  <p>Invited email</p>
                  <p>Role: {member.role}</p>
                  <p>Membership: {member.status}</p>
                  <p>Created {formatWhen(member.createdAt)}</p>
                  <p>Updated {formatWhen(member.updatedAt)}</p>
                  {member.linkedAccount ? (
                    <button type="button" onClick={() => onOpenAccount(member.linkedAccount!.id)}>
                      {member.linkedAccount.displayName}{member.linkedAccount.deleted ? ' (deleted)' : ''}
                    </button>
                  ) : <p>No linked product account</p>}
                </article>
              ))}
            </div>
            {directory.nextCursor ? <button type="button" onClick={() => onChange({ ...query, directoryCursor: directory.nextCursor })}>Next memberships</button> : null}
          </>
        ) : null}
      </section>
      <section aria-labelledby="staff-audit-title" aria-busy={phase === 'loading'}>
        <h2 id="staff-audit-title">Staff audit</h2>
        <p className="section-note">Assignment, notes, and case-status changes stay in each dispute’s own history. This page lists staff audit records only.</p>
        <form className="market-search" onSubmit={(event: FormEvent) => {
          event.preventDefault()
          onChange({ ...query, q: draft.trim(), cursor: null })
        }}>
          <label htmlFor={searchId}>
            Search
            <input id={searchId} value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <p className="section-note">Search matches part of an action name or its label, part of the acting staff member’s invited email, or a complete target id. Product account emails are not searched.</p>
          <div className="actions">
            <button type="submit">Search</button>
            {draft.trim() || query.q.trim() ? (
              <button type="button" className="secondary" onClick={() => { setDraft(''); onChange({ ...query, q: '', cursor: null }) }}>Clear</button>
            ) : null}
          </div>
        </form>
        <AuditFilters groups={query.groups} onToggle={toggleGroup} onClear={() => onChange({ ...query, groups: [], cursor: null })} />
        {phase === 'loading' ? <LoadingIndicator compact label="Loading staff audit" /> : null}
        {phase === 'ready' && !audit ? <p role="alert">Staff audit is unavailable.</p> : null}
        {audit ? (
          <>
            <p>Matching events: {audit.matchCount}</p>
            <p>Total events: {audit.total}</p>
            {audit.items.length === 0 ? <p>No staff audit events match.</p> : null}
            <div className="records">
              {audit.items.map((item) => (
                <AuditRecord
                  key={item.id}
                  item={item}
                  onOpenAccount={onOpenAccount}
                  onOpenReport={onOpenReport}
                  onOpenJob={onOpenJob}
                  onOpenService={onOpenService}
                  onOpenEngagement={onOpenEngagement}
                />
              ))}
            </div>
            {audit.nextCursor ? <button type="button" onClick={() => onChange({ ...query, cursor: audit.nextCursor })}>Next events</button> : null}
          </>
        ) : null}
      </section>
    </div>
  )
}

function AuditRecord({
  item,
  onOpenAccount,
  onOpenReport,
  onOpenJob,
  onOpenService,
  onOpenEngagement,
}: {
  item: StaffAuditItem
  onOpenAccount: (id: string) => void
  onOpenReport: (id: string) => void
  onOpenJob: (id: string) => void
  onOpenService: (id: string) => void
  onOpenEngagement: (id: string) => void
}) {
  const kind = TARGET_LABELS[item.target.kind] ?? item.target.kind
  const open = item.target.hasDetailScreen && item.target.presence !== 'missing'
    ? openTarget(item.target.kind, item.target.id, item.target.presence === 'deleted', {
        onOpenAccount, onOpenReport, onOpenJob, onOpenService, onOpenEngagement,
      })
    : null
  return (
    <article className="record">
      <h3>{item.actionLabel}</h3>
      <p>{formatWhen(item.createdAt)}</p>
      <p>{actorText(item)}</p>
      <p>{kind}: {item.target.id}</p>
      {open}
      {targetNote(item) ? <p>{targetNote(item)}</p> : null}
      <p className="report-text">{item.reason ?? 'No reason recorded'}</p>
    </article>
  )
}

function actorText(item: StaffAuditItem): string {
  if (item.actor.kind === 'staff') {
    const identity = item.actor.label ? `Acting staff: ${item.actor.label}` : 'Acting staff'
    return `${identity} · ${item.actor.membershipStatus}`
  }
  return item.actor.label
}

function targetNote(item: StaffAuditItem): string {
  const { hasDetailScreen, presence } = item.target
  if (hasDetailScreen && presence === 'deleted') return 'Marked deleted. The retained record can still be opened.'
  if (hasDetailScreen && presence === 'missing') return 'No longer available.'
  if (!hasDetailScreen && presence === 'deleted') return 'Marked deleted. No standalone detail screen.'
  if (!hasDetailScreen && presence === 'missing') return item.target.kind === 'staff_membership'
    ? 'No longer available.'
    : 'No longer available. No standalone detail screen.'
  if (!hasDetailScreen) return item.target.kind === 'staff_membership'
    ? 'Membership record is still on file.'
    : 'No standalone detail screen.'
  return ''
}

function openTarget(
  kind: string,
  id: string,
  deleted: boolean,
  open: {
    onOpenAccount: (id: string) => void
    onOpenReport: (id: string) => void
    onOpenJob: (id: string) => void
    onOpenService: (id: string) => void
    onOpenEngagement: (id: string) => void
  },
) {
  const suffix = deleted ? ' (deleted)' : ''
  if (kind === 'account') return <button type="button" onClick={() => open.onOpenAccount(id)}>Open account{suffix}</button>
  if (kind === 'report') return <button type="button" onClick={() => open.onOpenReport(id)}>Open report{suffix}</button>
  if (kind === 'job') return <button type="button" onClick={() => open.onOpenJob(id)}>Open job{suffix}</button>
  if (kind === 'service') return <button type="button" onClick={() => open.onOpenService(id)}>Open service{suffix}</button>
  if (kind === 'engagement') return <button type="button" onClick={() => open.onOpenEngagement(id)}>Open engagement{suffix}</button>
  return null
}

function AuditFilters({ groups, onToggle, onClear }: { groups: string[]; onToggle: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false)
  const summary = groups.length === 0 ? 'All actions' : groups.length === 1 ? GROUPS.find((item) => item.id === groups[0])?.label ?? '1 group' : `${groups.length} groups`
  return (
    <div className="report-filter-bar">
      <FilterMenu label="Action group" summary={summary} open={open} onToggle={() => setOpen((value) => !value)} onDone={() => setOpen(false)}>
        {GROUPS.map((item) => (
          <label key={item.id}><input type="checkbox" checked={groups.includes(item.id)} onChange={() => onToggle(item.id)} />{item.label}</label>
        ))}
      </FilterMenu>
      {groups.length > 0 ? <button type="button" className="report-clear" onClick={onClear}>Clear filters</button> : null}
    </div>
  )
}

function FilterMenu({ label, summary, open, onToggle, onDone, children }: { label: string; summary: string; open: boolean; onToggle: () => void; onDone: () => void; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
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
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onDone()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, onDone])
  return (
    <div className="report-menu" ref={rootRef}>
      <button ref={triggerRef} type="button" className="report-filter-trigger" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span>{summary}</span>
        <span className="report-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="report-menu-panel" id={panelId}>
          <div className="report-menu-options" role="group" aria-label={label}>{children}</div>
          <div className="report-menu-footer">
            <button type="button" className="secondary" onClick={() => { onDone(); triggerRef.current?.focus() }}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
