import type { OperationsCard, OperationsOverview, OpsState } from './adminTypes'
import '../demo/demo.css'

export const OPERATIONS_POLL_MS = 60_000

const DASHBOARD_PREFIXES = ['https://railway.com/', 'https://supabase.com/', 'https://dashboard.uptimerobot.com/']

const GROUPS: { title: string; ids: OperationsCard['id'][] }[] = [
  { title: 'Availability', ids: ['uptime'] },
  { title: 'Deployment', ids: ['railway'] },
  { title: 'Database and backups', ids: ['database', 'supabase_project', 'supabase_backup'] },
]

export function OperationsView({
  overview,
  onRefresh,
  embedded = false,
}: {
  overview: OperationsOverview
  onRefresh: () => void
  embedded?: boolean
}) {
  const attention = overview.cards.filter(needsAttention).length
  return (
    <section className="ops-board" aria-label="Provider readings">
      {embedded ? (
        <div className="actions">
          <button type="button" className="secondary" onClick={onRefresh}>Refresh</button>
        </div>
      ) : (
        <div className="ops-heading">
          <h1 id="portal-title">Operations</h1>
          <button type="button" className="secondary" onClick={onRefresh}>Refresh</button>
        </div>
      )}
      <p className="quiet-note">
        {attention === 0
          ? 'No reading in this summary is stale, unavailable, or unconfigured. That is not a claim that the application is fully healthy.'
          : `${attention} ${attention === 1 ? 'reading needs' : 'readings need'} attention.`}
        {' '}Summary assembled {formatWhen(overview.generatedAt)}.
      </p>
      {GROUPS.map((group) => (
        <div key={group.title} className="ops-group">
          <h2>{group.title}</h2>
          <div className="ops-grid">
            {group.ids.map((id) => {
              const card = overview.cards.find((item) => item.id === id)
              return card ? <OperationCard key={id} card={card} /> : null
            })}
          </div>
        </div>
      ))}
    </section>
  )
}

function OperationCard({ card }: { card: OperationsCard }) {
  const dashboard = allowedDashboard(card.dashboardUrl)
  const badge = badgeLabel(card)
  return (
    <article className="ops-card">
      <header>
        <div>
          <h3>{plainTitle(card.id)}</h3>
          <p className="ops-source">{sourceLabel(card.id)}</p>
        </div>
        <p className="ops-badge" data-state={card.stale ? 'stale' : card.state}>
          <StatusIcon state={card.stale ? 'stale' : card.state} />
          <span>{badge}</span>
        </p>
      </header>
      <p>{shortExplanation(card)}</p>
      <p className="ops-time">{readingLine(card)}</p>
      {card.stale ? <p className="ops-warning">{staleWarning(card)}</p> : null}
      {card.state === 'not_configured' ? <p className="ops-warning">This provider is not configured, so there is no reading.</p> : null}
      {card.id === 'supabase_backup' && card.state === 'up' && !card.stale ? (
        <p className="ops-warning">A completed backup record does not prove the backup can be restored.</p>
      ) : null}
      {card.id === 'railway' && card.state === 'up' && !card.stale ? (
        <p className="ops-warning">A successful deployment is not proof the application is currently healthy.</p>
      ) : null}
      <div className="ops-links">
        <details>
          <summary>Details</summary>
          {card.details.map((detail) => (
            <p key={detail.label}>{detail.label}: {detail.value}</p>
          ))}
          <p>{card.eventAt ? `Provider event ${formatWhen(card.eventAt)}.` : 'Provider event time was not included.'}</p>
          {card.incidents.length > 0 ? <h4>Incidents on the first page</h4> : null}
          {card.incidents.length > 0 ? <p>The API does not document that this page is the newest incidents.</p> : null}
          {card.incidents.map((incident, index) => (
            <p key={`${incident.label}-${incident.at ?? index}`}>{incident.label}{incident.at ? ` at ${formatWhen(incident.at)}` : ''}</p>
          ))}
        </details>
        {dashboard ? <a href={dashboard}>Open the provider dashboard</a> : <p>Dashboard link unavailable</p>}
      </div>
    </article>
  )
}

function badgeLabel(card: OperationsCard): string {
  if (card.stale) return 'Stale'
  if (card.id === 'railway' && card.state === 'up') return 'Deployment succeeded'
  if (card.id === 'database' && card.state === 'up') return 'Connected'
  if (card.id === 'uptime' && card.state === 'up') return 'Monitor up'
  if (card.id === 'uptime' && card.state === 'paused') return 'Monitor paused'
  if (card.id === 'supabase_backup' && card.state === 'up') return 'Backup available'
  if (card.id === 'supabase_project' && card.state === 'up') return 'Project active'
  if (card.state === 'down') return 'Down'
  if (card.state === 'degraded') return 'Degraded'
  if (card.state === 'unknown') return 'Unknown'
  if (card.state === 'unavailable') return 'Unavailable'
  if (card.state === 'not_configured') return 'Not configured'
  if (card.state === 'not_available') return 'Not available'
  return 'Recorded'
}

function shortExplanation(card: OperationsCard): string {
  return card.summary
}

function readingLine(card: OperationsCard): string {
  if (!card.fetchedAt) return 'No reading yet.'
  if (card.stale) return `Last confirmed ${confirmedWord(card)} at ${formatWhen(card.fetchedAt)}.`
  return `Updated ${formatWhen(card.fetchedAt)}.`
}

function staleWarning(card: OperationsCard): string {
  if (card.id === 'supabase_backup') return 'Stale backup information. This is not a current backup.'
  return 'Current status could not be verified. This reading is not current.'
}

function confirmedWord(card: OperationsCard): string {
  if (card.id === 'database' && card.state === 'up') return 'connected'
  if (card.id === 'railway' && card.state === 'up') return 'deployment succeeded'
  if (card.id === 'uptime' && card.state === 'up') return 'monitor up'
  return badgeLabel({ ...card, stale: false }).toLowerCase()
}

function needsAttention(card: OperationsCard): boolean {
  return card.stale || card.state === 'down' || card.state === 'unavailable' || card.state === 'unknown' || card.state === 'not_configured' || card.state === 'not_available' || card.state === 'degraded'
}

function plainTitle(id: OperationsCard['id']): string {
  if (id === 'database') return 'Database connection'
  if (id === 'railway') return 'API deployment'
  if (id === 'supabase_project') return 'Supabase project'
  if (id === 'supabase_backup') return 'Database backup'
  return 'Production monitor'
}

function sourceLabel(id: OperationsCard['id']): string {
  if (id === 'railway') return 'Railway'
  if (id === 'database') return 'Application database'
  if (id === 'uptime') return 'UptimeRobot'
  return 'Supabase'
}

function StatusIcon({ state }: { state: OpsState | 'stale' }) {
  const label = state === 'stale' ? 'stale' : state
  return <span className="ops-icon" aria-hidden="true" data-icon={label} />
}

function allowedDashboard(url: string | null): string | null {
  if (!url) return null
  return DASHBOARD_PREFIXES.some((prefix) => url.startsWith(prefix)) ? url : null
}

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
