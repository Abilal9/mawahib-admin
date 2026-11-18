import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { InvoiceRetryResult, PaymentsQuery, StaffFollowUpPage, StaffParty, StaffPaymentLedgerPage } from './adminTypes'
import { ButtonSpinner, LoadingIndicator } from './LoadingIndicator'

const ATTEMPT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled'] as const
const INVOICE_STATES = [
  { id: 'none', label: 'No invoice' },
  { id: 'pending', label: 'Pending' },
  { id: 'generated', label: 'Generated' },
  { id: 'failed', label: 'Failed' },
] as const
const FOLLOW_STATES = [
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'recorded', label: 'Recorded' },
] as const
const OUTCOMES: Record<string, string> = {
  no_real_funds: 'No real funds',
  simulated_exercise: 'Simulated exercise',
  recorded_outside_provider: 'Recorded outside the payment provider',
}

export function PaymentsView({
  query,
  attempts,
  followUps,
  phase,
  onChange,
  onOpenUser,
  onOpenEngagement,
  onViewInvoice,
  onRetryInvoice,
}: {
  query: PaymentsQuery
  attempts: StaffPaymentLedgerPage | null
  followUps: StaffFollowUpPage | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onChange: (next: PaymentsQuery) => void
  onOpenUser: (id: string) => void
  onOpenEngagement: (id: string) => void
  onViewInvoice: (id: string) => Promise<{ url: string; originalFileName: string } | null>
  onRetryInvoice: (id: string) => Promise<InvoiceRetryResult>
}) {
  const searchId = useId()
  const [draft, setDraft] = useState(query.q)
  const [notice, setNotice] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [readyIds, setReadyIds] = useState<Record<string, { status: string; hasDocument: boolean; issuedAt: string | null }>>({})
  if (phase === 'denied') return <p role="alert">Staff access is not active for this account.</p>
  if (phase === 'expired') return <p role="alert">Your session has expired. Sign in again.</p>

  function toggle(group: 'statuses' | 'invoiceStates' | 'followStates', id: string) {
    const current = query[group]
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    onChange({
      ...query,
      [group]: next,
      cursor: group === 'followStates' ? query.cursor : null,
      followCursor: group === 'followStates' ? null : query.followCursor,
    })
  }

  async function retry(id: string) {
    if (retryingId) return
    setNotice(null)
    setRetryingId(id)
    try {
      const result = await onRetryInvoice(id)
      if (!result.ok) {
        setNotice(result.message)
        return
      }
      setReadyIds((current) => ({
        ...current,
        [id]: { status: result.invoice.status, hasDocument: result.invoice.hasDocument, issuedAt: result.invoice.issuedAt },
      }))
      setNotice(result.invoice.hasDocument ? 'Invoice ready.' : 'The invoice is still not ready.')
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="demo-list">
      <form className="market-search" onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onChange({ ...query, q: draft.trim(), cursor: null })
      }}>
        <label htmlFor={searchId}>
          Search
          <input id={searchId} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <div className="actions">
          <button type="submit">Search</button>
          {draft.trim() || query.q.trim() ? (
            <button type="button" className="secondary" onClick={() => { setDraft(''); onChange({ ...query, q: '', cursor: null }) }}>Clear</button>
          ) : null}
        </div>
      </form>
      <PaymentFilters query={query} onToggle={toggle} onChange={onChange} />
      <section aria-busy={phase === 'loading'}>
        <h2>Payment attempts</h2>
        <p>Total attempts: {attempts ? attempts.totalAttempts : <span className="metric-skeleton" aria-label="Loading" />}</p>
        <p>{phase === 'loading' ? <span className="metric-skeleton" aria-label="Loading" /> : attempts ? `Matching attempts: ${attempts.matchCount}` : 'Matching attempts unavailable'}</p>
        <p className="section-note">Each row is one payment attempt. An invoice is shown under its attempt. Counts are rows, not money, and simulated amounts are not revenue.</p>
        {phase === 'loading' ? <LoadingIndicator compact label="Loading payment attempts" /> : null}
        {phase === 'unavailable' ? <p role="alert">Payment attempts are temporarily unavailable.</p> : null}
        {phase === 'ready' && attempts?.items.length === 0 ? <p>No payment attempts match.</p> : null}
        {attempts?.items.map((payment) => {
          const invoice = payment.invoice ? { ...payment.invoice, ...readyIds[payment.invoice.id] } : null
          const retryable = Boolean(invoice?.retryable && !invoice.hasDocument)
          return (
            <article key={payment.id} className="demo-panel">
              <p><strong>{labelWord(payment.status)}</strong> · {payment.amount} {payment.currency}</p>
              {payment.simulated ? <p>Simulated — no real payment</p> : null}
              <p>{payment.referencedByProvider ? 'Provider reference recorded' : 'No provider reference'}</p>
              <p>Payer: <Party party={payment.payer} onOpen={onOpenUser} /> · Payee: <Party party={payment.payee} onOpen={onOpenUser} /></p>
              <p>
                Engagement:{' '}
                <button type="button" onClick={() => onOpenEngagement(payment.engagement.id)}>{payment.engagement.title}</button>
                {' · '}{engagementLabel(payment.engagement)}
              </p>
              <p>Created {formatWhen(payment.createdAt)}</p>
              {payment.succeededAt ? <p>Succeeded {formatWhen(payment.succeededAt)}</p> : null}
              {payment.failedAt ? <p>Failed {formatWhen(payment.failedAt)}</p> : null}
              {invoice ? (
                <>
                  <p>Invoice {invoice.invoiceNumber}</p>
                  <p>{invoice.issuedAt ? `Issued ${formatWhen(invoice.issuedAt)}` : 'Issue date not recorded'}</p>
                  <p>{invoice.amount} {invoice.currency} · {labelWord(invoice.status)}</p>
                  {invoice.simulated ? <p>Simulated — no real payment</p> : null}
                  <div className="report-row-actions">
                    {invoice.hasDocument ? (
                      <>
                        <button type="button" onClick={() => void openInvoice(invoice.id, onViewInvoice, setNotice, false)}>View invoice</button>
                        <button type="button" onClick={() => void openInvoice(invoice.id, onViewInvoice, setNotice, true)}>Download</button>
                      </>
                    ) : null}
                    {retryable ? (
                      <button type="button" disabled={retryingId !== null} aria-busy={retryingId === invoice.id} onClick={() => void retry(invoice.id)}>
                        {retryingId === invoice.id ? <ButtonSpinner /> : null}
                        Retry invoice
                      </button>
                    ) : null}
                  </div>
                  {!invoice.hasDocument && invoice.retryUnavailableReason ? <p>{invoice.retryUnavailableReason}</p> : null}
                </>
              ) : <p>No invoice issued</p>}
            </article>
          )
        })}
        {attempts?.nextCursor ? (
          <button type="button" onClick={() => onChange({ ...query, cursor: attempts.nextCursor })}>Next payment attempts</button>
        ) : null}
      </section>
      <section aria-busy={phase === 'loading'}>
        <h2>Financial follow-up</h2>
        <p className="section-note">This is a staff record. It does not confirm a provider refund or payout. Outstanding means follow-up is still required. Recorded means a staff outcome was saved. Follow-up that was not required stays off this list.</p>
        <p>Required follow-up records: {followUps ? followUps.totalRecords : <span className="metric-skeleton" aria-label="Loading" />}</p>
        <p>{phase === 'loading' ? <span className="metric-skeleton" aria-label="Loading" /> : followUps ? `Matching follow-up records: ${followUps.matchCount}` : 'Matching follow-up records unavailable'}</p>
        {phase === 'loading' ? <LoadingIndicator compact label="Loading financial follow-up" /> : null}
        {phase === 'unavailable' ? <p role="alert">Financial follow-up is temporarily unavailable.</p> : null}
        {phase === 'ready' && followUps?.items.length === 0 ? <p>No financial follow-up records match.</p> : null}
        {followUps?.items.map((item) => (
          <article key={item.id} className="demo-panel">
            <p><strong>{item.state === 'outstanding' ? 'Outstanding' : 'Recorded'}</strong></p>
            {item.outcome ? <p>{OUTCOMES[item.outcome] ?? labelWord(item.outcome)}</p> : null}
            {item.note ? <p>{item.note}</p> : null}
            <p>{item.recordedAt ? `Recorded ${formatWhen(item.recordedAt)}` : 'No recorded time'}</p>
            {item.recordedByStaffLabel ? <p>Recorded by {item.recordedByStaffLabel}</p> : null}
            <p>
              Engagement:{' '}
              <button type="button" onClick={() => onOpenEngagement(item.engagement.id)}>{item.engagement.title}</button>
              {' · '}{engagementLabel(item.engagement)}
            </p>
          </article>
        ))}
        {followUps?.nextCursor ? (
          <button type="button" onClick={() => onChange({ ...query, followCursor: followUps.nextCursor })}>Next follow-up records</button>
        ) : null}
      </section>
      {notice ? <p role="alert">{notice}</p> : null}
    </div>
  )
}

function PaymentFilters({
  query,
  onToggle,
  onChange,
}: {
  query: PaymentsQuery
  onToggle: (group: 'statuses' | 'invoiceStates' | 'followStates', id: string) => void
  onChange: (next: PaymentsQuery) => void
}) {
  const [openMenu, setOpenMenu] = useState<'status' | 'invoice' | 'follow' | null>(null)
  const statuses = ATTEMPT_STATUSES.map((id) => ({ id, label: labelWord(id) }))
  return (
    <>
      <div className="report-filter-bar">
        <FilterMenu label="Status" summary={selectionSummary(query.statuses, statuses, 'All statuses', 'statuses')} open={openMenu === 'status'} onToggle={() => setOpenMenu(openMenu === 'status' ? null : 'status')} onDone={() => setOpenMenu(null)}>
          {statuses.map((item) => (
            <label key={item.id}><input type="checkbox" checked={query.statuses.includes(item.id)} onChange={() => onToggle('statuses', item.id)} />{item.label}</label>
          ))}
        </FilterMenu>
        <FilterMenu label="Invoice" summary={selectionSummary(query.invoiceStates, [...INVOICE_STATES], 'All invoice states', 'invoice states')} open={openMenu === 'invoice'} onToggle={() => setOpenMenu(openMenu === 'invoice' ? null : 'invoice')} onDone={() => setOpenMenu(null)}>
          {INVOICE_STATES.map((item) => (
            <label key={item.id}><input type="checkbox" checked={query.invoiceStates.includes(item.id)} onChange={() => onToggle('invoiceStates', item.id)} />{item.label}</label>
          ))}
        </FilterMenu>
        <FilterMenu label="Follow-up" summary={selectionSummary(query.followStates, [...FOLLOW_STATES], 'All required follow-up', 'follow-up states')} open={openMenu === 'follow'} onToggle={() => setOpenMenu(openMenu === 'follow' ? null : 'follow')} onDone={() => setOpenMenu(null)}>
          {FOLLOW_STATES.map((item) => (
            <label key={item.id}><input type="checkbox" checked={query.followStates.includes(item.id)} onChange={() => onToggle('followStates', item.id)} />{item.label}</label>
          ))}
        </FilterMenu>
        <label className="market-deleted">
          <input type="checkbox" checked={query.hideDeletedEngagements} onChange={(event) => onChange({ ...query, hideDeletedEngagements: event.target.checked, cursor: null })} />
          Hide deleted engagements
        </label>
        <button type="button" className="report-clear" onClick={() => onChange({ ...query, statuses: [], invoiceStates: [], followStates: [], hideDeletedEngagements: false, cursor: null, followCursor: null })}>Clear filters</button>
      </div>
    </>
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

function selectionSummary(selected: string[], options: Array<{ id: string; label: string }>, allLabel: string, plural: string): string {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return options.find((item) => item.id === selected[0])?.label ?? allLabel
  return `${selected.length} ${plural}`
}

function Party({ party, onOpen }: { party: StaffParty | null; onOpen: (id: string) => void }) {
  if (!party) return <>Unavailable</>
  return <button type="button" onClick={() => onOpen(party.id)}>{party.displayName}{party.deleted ? ' (deleted)' : ''}</button>
}

function engagementLabel(engagement: { status: string; closedByMawahib: boolean; cancelledByMawahib: boolean; deleted: boolean }): string {
  const status = engagement.closedByMawahib
    ? 'Closed by Mawahib'
    : engagement.cancelledByMawahib
      ? 'Cancelled by Mawahib'
      : labelWord(engagement.status)
  return engagement.deleted ? `${status} · Deleted` : status
}

function labelWord(value: string): string {
  const text = value.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function openInvoice(
  id: string,
  onViewInvoice: (id: string) => Promise<{ url: string; originalFileName: string } | null>,
  setNotice: (value: string | null) => void,
  download: boolean,
) {
  setNotice(null)
  const file = await onViewInvoice(id)
  if (!file) {
    setNotice('The invoice file is not available.')
    return
  }
  const link = document.createElement('a')
  link.href = file.url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  if (download) link.download = file.originalFileName
  link.click()
}
