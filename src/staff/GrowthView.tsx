import type { GrowthSnapshot } from './adminTypes'
import { LoadingIndicator } from './LoadingIndicator'

const RIYADH = 'Asia/Riyadh'

export function GrowthView({
  period,
  snapshot,
  phase,
  onPeriod,
}: {
  period: 7 | 30
  snapshot: GrowthSnapshot | null
  phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'
  onPeriod: (period: 7 | 30) => void
}) {
  if (phase === 'denied') return <p role="alert">Staff access is not active for this account.</p>
  if (phase === 'expired') return <p role="alert">Your session has expired. Sign in again.</p>
  const current = snapshot?.current
  const created = snapshot?.createdInPeriod
  return (
    <div className="growth-page">
      <p className="section-note">Growth counts what is retained and qualifying now. It does not show campaigns, consent, or attribution.</p>
      <section>
        <h2>Now</h2>
        <div className="demo-metrics growth-metrics">
          <Card title="Accounts" value={current?.accounts} phase={phase} detail="Not deleted, including suspended accounts. Same definition as Overview." />
          <Card title="Public jobs" value={current?.publicJobs} phase={phase} detail="Open listings that are not deleted or staff-hidden, from an active poster. This is not Overview’s total jobs." />
          <Card title="Public services" value={current?.publicServices} phase={phase} detail="Published services that are not deleted or staff-hidden, from an active owner." />
          <Card title="Public posts" value={current?.publicPosts} phase={phase} detail="Public posts that are not deleted or staff-hidden, from an active author. Connections-only posts are excluded." />
          <Card title="Staff-hidden jobs" value={current?.staffHiddenJobs} phase={phase} detail="Retained jobs with a current staff hide. This is not a count of hide actions." />
          <Card title="Staff-hidden services" value={current?.staffHiddenServices} phase={phase} detail="Retained services with a current staff hide. This is not a count of hide actions." />
          <Card title="Engagements" value={current?.engagements} phase={phase} detail="Not deleted, every business status. Same definition as Overview." />
        </div>
      </section>
      <section aria-busy={phase === 'loading'}>
        <h2>Created in the selected period</h2>
        <div className="growth-period" role="group" aria-label="Period">
          <button type="button" className={period === 7 ? undefined : 'secondary'} aria-pressed={period === 7} onClick={() => onPeriod(7)}>7 days</button>
          <button type="button" className={period === 30 ? undefined : 'secondary'} aria-pressed={period === 30} onClick={() => onPeriod(30)}>30 days</button>
        </div>
        <p className="section-note">These are records created in the selected period that still qualify now.</p>
        {snapshot ? <p>Showing {formatDay(snapshot.periodStart)} – {formatDay(snapshot.periodEnd)}, Asia/Riyadh. Updated {formatWhen(snapshot.asOf)}.</p> : <p>{phase === 'loading' ? <span className="metric-skeleton" aria-label="Loading" /> : 'The date range is unavailable.'}</p>}
        {phase === 'loading' ? <LoadingIndicator compact label="Loading growth counts" /> : null}
        {phase === 'unavailable' ? <p role="alert">Growth counts are temporarily unavailable.</p> : null}
        <div className="demo-metrics growth-metrics">
          <Card title="Accounts" value={created?.accounts} phase={phase} detail="Created in the period and still not deleted." />
          <Card title="Public jobs" value={created?.publicJobs} phase={phase} detail="Created in the period and still public now." />
          <Card title="Public services" value={created?.publicServices} phase={phase} detail="Created in the period and still public now." />
          <Card title="Public posts" value={created?.publicPosts} phase={phase} detail="Created in the period and still public now." />
          <Card title="Engagements" value={created?.engagements} phase={phase} detail="Created in the period and still not deleted." />
        </div>
        <details className="growth-help">
          <summary>How these counts work</summary>
          <p>Days are calendar days in Asia/Riyadh, including today. The window starts at midnight on the first day and ends at the time this page was requested.</p>
          <p>A public job is an open listing that is not deleted or staff-hidden, posted by an account that is not deleted and is active. Expired, closed, draft, and other listing statuses are not public. An expired listing is a status, not a separate clock.</p>
          <p>A public service is published, not deleted, and not staff-hidden, from an active owner. A public post has public visibility, is not deleted or staff-hidden, and has an active author.</p>
          <p>A row created in the period and later deleted, closed, hidden, or owned by a suspended or deleted account is not in the period count. That does not describe whether it was public earlier. Staff-hidden cards are the current hide mark only.</p>
        </details>
      </section>
    </div>
  )
}

function Card({ title, value, phase, detail }: { title: string; value: number | undefined; phase: 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'; detail: string }) {
  const shown = phase === 'ready' && typeof value === 'number'
    ? String(value)
    : phase === 'loading'
      ? <span className="metric-skeleton" aria-label="Loading" />
      : 'Unavailable'
  return (
    <article className="demo-metric">
      <span className="metric-title">{title}</span>
      <span className="metric-value">{shown}</span>
      <span className="metric-detail">{detail}</span>
    </article>
  )
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: RIYADH, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: RIYADH, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}
