import type { OperationsCard, OperationsOverview, OpsState } from './adminTypes'

export const OPERATIONS_POLL_MS = 60_000

const DASHBOARD_PREFIXES = ['https://railway.com/', 'https://supabase.com/', 'https://dashboard.uptimerobot.com/']

export function OperationsView({
  overview,
  onRefresh,
}: {
  overview: OperationsOverview
  onRefresh: () => void
}) {
  return (
    <>
      <h1 id="portal-title">Operations</h1>
      <p>These are separate readings. One healthy card does not show that the application is fully healthy or that it can be restored.</p>
      <p>Summary assembled {formatWhen(overview.generatedAt)}. The portal asks the server again about once a minute. The server reuses a shared reading for about a minute.</p>
      <div className="actions">
        <button type="button" onClick={onRefresh}>
          Refresh summary
        </button>
      </div>
      <div className="records">
        {overview.cards.map((item) => (
          <OperationCard key={item.id} card={item} />
        ))}
      </div>
    </>
  )
}

function OperationCard({ card }: { card: OperationsCard }) {
  const dashboard = allowedDashboard(card.dashboardUrl)
  return (
    <article className="record">
      <h2>{card.title}</h2>
      <p className="ops-state" data-state={card.stale ? 'stale' : card.state}>
        {card.stale ? 'Stale' : stateLabel(card.state)}
      </p>
      {card.stale && card.id === 'supabase_backup' ? (
        <p>
          Stale backup information. The original reading
          {card.fetchedAt ? ` was fetched ${formatWhen(card.fetchedAt)}` : ' time is unavailable'}. This is not a current backup.
        </p>
      ) : null}
      {card.stale && card.id !== 'supabase_backup' ? (
        <p>Last known state: {stateLabel(card.state)}. This reading is not current.</p>
      ) : null}
      <p>{card.summary}</p>
      <p>{card.fetchedAt ? `Provider reading fetched ${formatWhen(card.fetchedAt)}.` : 'No provider reading was fetched.'}</p>
      <p>{card.eventAt ? `Provider event ${formatWhen(card.eventAt)}.` : 'Provider event time is not available.'}</p>
      {card.details.map((detail) => (
        <p key={detail.label}>
          {detail.label}: {detail.value}
        </p>
      ))}
      {card.incidents.length > 0 ? <h3>Incidents on the first page</h3> : null}
      {card.incidents.length > 0 ? (
        <p>These are incidents from the first returned page. The API does not document that page as the newest incidents.</p>
      ) : null}
      {card.incidents.map((incident, index) => (
        <p key={`${incident.label}-${incident.at ?? index}`}>
          {incident.label}
          {incident.at ? ` at ${formatWhen(incident.at)}` : ''}
        </p>
      ))}
      {dashboard ? (
        <p>
          <a href={dashboard}>Open the provider dashboard</a>. The portal login does not grant access there.
        </p>
      ) : (
        <p>The provider dashboard link is not available. A provider account is still required for that dashboard.</p>
      )}
    </article>
  )
}

function stateLabel(state: OpsState): string {
  switch (state) {
    case 'up':
      return 'Up'
    case 'down':
      return 'Down'
    case 'degraded':
      return 'Degraded'
    case 'paused':
      return 'Paused'
    case 'unknown':
      return 'Unknown'
    case 'unavailable':
      return 'Unavailable'
    case 'not_configured':
      return 'Not configured'
    case 'not_available':
      return 'Not available'
  }
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
