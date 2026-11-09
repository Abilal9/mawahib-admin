import { useEffect, useId, useState, type FormEvent } from 'react'
import type {
  MarketplaceQuery,
  MarketplaceTab,
  StaffApplicationDetail,
  StaffApplicationListItem,
  StaffEngagementDetail,
  StaffEngagementListItem,
  StaffJobDetail,
  StaffJobListItem,
  StaffParty,
  StaffServiceDetail,
  StaffServiceListItem,
} from './adminTypes'
import { LoadingIndicator } from './LoadingIndicator'

export type MarketplacePhase = 'loading' | 'ready' | 'unavailable' | 'denied' | 'expired'

const TABS: Array<{ id: MarketplaceTab; label: string }> = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'services', label: 'Services' },
  { id: 'applications', label: 'Applications' },
  { id: 'engagements', label: 'Engagements' },
]

const STATUS: Record<MarketplaceTab, string[]> = {
  jobs: ['draft', 'open', 'archived', 'closed', 'in_progress', 'completed', 'expired'],
  services: ['draft', 'published', 'archived'],
  applications: ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'],
  engagements: ['requested', 'accepted', 'declined', 'cancelled', 'pending_payment', 'payment_failed', 'in_progress', 'delivered', 'disputed', 'completed'],
}

const EMPLOYMENT = ['full_time', 'part_time', 'contract', 'freelance', 'gig']
const SOURCES = ['listing_application', 'service_request', 'direct']

export function MarketplaceList({
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
  query: MarketplaceQuery
  items: Array<StaffJobListItem | StaffServiceListItem | StaffApplicationListItem | StaffEngagementListItem>
  nextCursor: string | null
  total: number | null
  matchCount: number | null
  phase: MarketplacePhase
  onChange: (next: MarketplaceQuery) => void
  onOpen: (id: string) => void
  onOpenUser: (id: string) => void
}) {
  const searchId = useId()
  const [draft, setDraft] = useState(query.q)
  useEffect(() => {
    setDraft(query.q)
  }, [query.q])
  function submit(event: FormEvent) {
    event.preventDefault()
    onChange({ ...query, q: draft.trim(), cursor: null })
  }
  return (
    <div className="demo-list">
      <div className="report-filters" role="tablist" aria-label="Marketplace records">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={query.tab === tab.id}
            onClick={() => onChange({ ...query, tab: tab.id, statuses: [], employmentTypes: [], sources: [], listingId: null, serviceOfferingId: null, cursor: null })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <form className="demo-filters" onSubmit={submit}>
        <label htmlFor={searchId}>Search</label>
        <input id={searchId} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit">Search</button>
      </form>
      <ChipRow
        label="Status"
        options={STATUS[query.tab]}
        selected={query.statuses}
        onChange={(statuses) => onChange({ ...query, statuses, cursor: null })}
      />
      {query.tab === 'jobs' ? (
        <ChipRow
          label="Type"
          options={EMPLOYMENT}
          selected={query.employmentTypes}
          onChange={(employmentTypes) => onChange({ ...query, employmentTypes, cursor: null })}
        />
      ) : null}
      {query.tab === 'engagements' ? (
        <ChipRow
          label="Source"
          options={SOURCES}
          selected={query.sources}
          onChange={(sources) => onChange({ ...query, sources, cursor: null })}
        />
      ) : null}
      <label>
        <input
          type="checkbox"
          checked={query.includeDeleted}
          onChange={(event) => onChange({ ...query, includeDeleted: event.target.checked, cursor: null })}
        />
        Include deleted records
      </label>
      {query.listingId ? <p>Limited to one job. <button type="button" onClick={() => onChange({ ...query, listingId: null, cursor: null })}>Clear</button></p> : null}
      {query.serviceOfferingId ? <p>Limited to one service. <button type="button" onClick={() => onChange({ ...query, serviceOfferingId: null, cursor: null })}>Clear</button></p> : null}
      <p>Total {labelTab(query.tab)}: {total === null ? 'Unavailable' : String(total)}</p>
      <p>{phase === 'loading' ? <span className="metric-skeleton" aria-hidden="true" /> : matchCount === null ? 'Matching records unavailable' : `Matching ${labelTab(query.tab)}: ${matchCount}`}</p>
      <p className="section-note">Deleted records stay out of the totals unless Include deleted records is on. Draft, archived, and closed records stay in the totals until a status filter narrows them. Counts cover every match, not only this page.</p>
      <div aria-busy={phase === 'loading'}>
        {phase === 'loading' ? <LoadingIndicator compact label={`Loading ${labelTab(query.tab)}`} /> : null}
        {phase === 'unavailable' ? <p role="alert">Marketplace records are temporarily unavailable. The filters are unchanged.</p> : null}
        {phase === 'denied' ? <p role="alert">Staff access is not active for this account.</p> : null}
        {phase === 'expired' ? <p role="alert">Your session has expired. Sign in again.</p> : null}
        {phase === 'ready' && items.length === 0 ? <p>No {labelTab(query.tab)} match these filters.</p> : null}
        {phase === 'ready' ? items.map((item) => (
          <MarketplaceRow key={item.id} tab={query.tab} item={item} onOpen={onOpen} onOpenUser={onOpenUser} />
        )) : null}
        {phase === 'ready' && nextCursor ? <button type="button" onClick={() => onChange({ ...query, cursor: nextCursor })}>Next</button> : null}
      </div>
    </div>
  )
}

export function MarketplaceDetail({
  tab,
  record,
  phase,
  onOpenUser,
  onOpenJob,
  onOpenService,
  onOpenApplication,
  onOpenEngagement,
  onOpenApplications,
  onOpenEngagements,
  onOpenDispute,
}: {
  tab: MarketplaceTab
  record: StaffJobDetail | StaffServiceDetail | StaffApplicationDetail | StaffEngagementDetail | null
  phase: MarketplacePhase
  onOpenUser: (id: string) => void
  onOpenJob: (id: string) => void
  onOpenService: (id: string) => void
  onOpenApplication: (id: string) => void
  onOpenEngagement: (id: string) => void
  onOpenApplications: (listingId: string) => void
  onOpenEngagements: (filter: { listingId?: string; serviceOfferingId?: string }) => void
  onOpenDispute: (id: string) => void
}) {
  if (phase === 'loading') return <LoadingIndicator compact label="Loading record" />
  if (phase === 'unavailable') return <p role="alert">This record is temporarily unavailable.</p>
  if (phase === 'denied') return <p role="alert">Staff access is not active for this account.</p>
  if (phase === 'expired') return <p role="alert">Your session has expired. Sign in again.</p>
  if (!record) return <p role="alert">That record is not available.</p>
  if (tab === 'jobs' && 'employmentType' in record) return <JobDetail record={record} onOpenUser={onOpenUser} onOpenApplications={onOpenApplications} onOpenEngagements={onOpenEngagements} />
  if (tab === 'services' && 'packageCount' in record) return <ServiceDetail record={record as StaffServiceDetail} onOpenUser={onOpenUser} onOpenEngagements={onOpenEngagements} />
  if (tab === 'applications' && 'applicant' in record) return <ApplicationDetail record={record as StaffApplicationDetail} onOpenUser={onOpenUser} onOpenJob={onOpenJob} onOpenEngagement={onOpenEngagement} />
  if (tab === 'engagements' && 'source' in record) return <EngagementDetail record={record as StaffEngagementDetail} onOpenUser={onOpenUser} onOpenJob={onOpenJob} onOpenService={onOpenService} onOpenApplication={onOpenApplication} onOpenDispute={onOpenDispute} />
  return <p role="alert">That record is not available.</p>
}

function ChipRow({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="report-filters" role="group" aria-label={label}>
      {options.map((option) => {
        const on = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((item) => item !== option) : [...selected, option])}
          >
            {labelWord(option)}
          </button>
        )
      })}
    </div>
  )
}

function MarketplaceRow({
  tab,
  item,
  onOpen,
  onOpenUser,
}: {
  tab: MarketplaceTab
  item: StaffJobListItem | StaffServiceListItem | StaffApplicationListItem | StaffEngagementListItem
  onOpen: (id: string) => void
  onOpenUser: (id: string) => void
}) {
  return (
    <article className="demo-row">
      <div>
        {tab === 'jobs' && 'employmentType' in item ? <JobRow item={item} onOpenUser={onOpenUser} /> : null}
        {tab === 'services' && 'packageCount' in item ? <ServiceRow item={item} onOpenUser={onOpenUser} /> : null}
        {tab === 'applications' && 'applicant' in item ? <ApplicationRow item={item} onOpenUser={onOpenUser} /> : null}
        {tab === 'engagements' && 'source' in item ? <EngagementRow item={item} onOpenUser={onOpenUser} /> : null}
      </div>
      <button type="button" className="text-action" onClick={() => onOpen(item.id)}>View</button>
    </article>
  )
}

function JobRow({ item, onOpenUser }: { item: StaffJobListItem; onOpenUser: (id: string) => void }) {
  return (
    <>
      <p><strong>{item.title}</strong>{item.deletedAt ? ' · Deleted' : ''}</p>
      <p>{labelWord(item.status)} · {labelWord(item.employmentType)}{item.companyName ? ` · ${item.companyName}` : ''}</p>
      <p>Poster: <Party party={item.poster} onOpen={onOpenUser} /></p>
      <p>{item.applicationCount} active applications</p>
    </>
  )
}

function ServiceRow({ item, onOpenUser }: { item: StaffServiceListItem; onOpenUser: (id: string) => void }) {
  return (
    <>
      <p><strong>{item.title}</strong>{item.deletedAt ? ' · Deleted' : ''}</p>
      <p>{labelWord(item.status)} · {item.fromPrice ? `From ${item.fromPrice} ${item.currency}` : 'No package price'}</p>
      <p>Owner: <Party party={item.owner} onOpen={onOpenUser} /></p>
    </>
  )
}

function ApplicationRow({ item, onOpenUser }: { item: StaffApplicationListItem; onOpenUser: (id: string) => void }) {
  return (
    <>
      <p><strong>{item.listing?.title ?? 'Job unavailable'}</strong>{item.deletedAt ? ' · Deleted' : ''}</p>
      <p>{labelWord(item.status)}{item.listing?.deleted ? ' · Job deleted' : ''}</p>
      <p>Applicant: <Party party={item.applicant} onOpen={onOpenUser} /></p>
    </>
  )
}

function EngagementRow({ item, onOpenUser }: { item: StaffEngagementListItem; onOpenUser: (id: string) => void }) {
  return (
    <>
      <p><strong>{item.title}</strong>{item.deletedAt ? ' · Deleted' : ''}</p>
      <p>{labelWord(item.status)} · {labelWord(item.source)}</p>
      <p>Client: <Party party={item.client} onOpen={onOpenUser} /> · Provider: <Party party={item.provider} onOpen={onOpenUser} /></p>
      <Payment item={item.payment} />
    </>
  )
}

function JobDetail({ record, onOpenUser, onOpenApplications, onOpenEngagements }: { record: StaffJobDetail; onOpenUser: (id: string) => void; onOpenApplications: (listingId: string) => void; onOpenEngagements: (filter: { listingId?: string }) => void }) {
  return (
    <section className="demo-list">
      <p>{labelWord(record.status)} · {labelWord(record.employmentType)}{record.deletedAt ? ' · Deleted' : ''}</p>
      <p>{record.companyName ?? 'No company name'} · {record.location}</p>
      <p>Poster: <Party party={record.poster} onOpen={onOpenUser} /></p>
      <p>Price: {record.pricing.type} {record.pricing.fixedAmount ?? record.pricing.minAmount ?? 'not set'} {record.pricing.currency}</p>
      <p><button type="button" onClick={() => onOpenApplications(record.id)}>{record.applicationCount} active applications</button></p>
      <p><button type="button" onClick={() => onOpenEngagements({ listingId: record.id })}>{record.engagementCount} active engagements</button></p>
    </section>
  )
}

function ServiceDetail({ record, onOpenUser, onOpenEngagements }: { record: StaffServiceDetail; onOpenUser: (id: string) => void; onOpenEngagements: (filter: { serviceOfferingId?: string }) => void }) {
  return (
    <section className="demo-list">
      <p>{labelWord(record.status)}{record.deletedAt ? ' · Deleted' : ''}</p>
      <p>Owner: <Party party={record.owner} onOpen={onOpenUser} /></p>
      <p>From {record.fromPrice ?? 'no price'} {record.currency}</p>
      {record.packages.map((item) => <p key={item.id}>{labelWord(item.tier)} · {item.price} {item.currency} · {item.deliveryLabel}</p>)}
      <p><button type="button" onClick={() => onOpenEngagements({ serviceOfferingId: record.id })}>{record.engagementCount} active engagements</button></p>
    </section>
  )
}

function ApplicationDetail({ record, onOpenUser, onOpenJob, onOpenEngagement }: { record: StaffApplicationDetail; onOpenUser: (id: string) => void; onOpenJob: (id: string) => void; onOpenEngagement: (id: string) => void }) {
  return (
    <section className="demo-list">
      <p>{labelWord(record.status)}{record.deletedAt ? ' · Deleted' : ''}</p>
      <p>Job: {record.listing ? <button type="button" onClick={() => onOpenJob(record.listing!.id)}>{record.listing.title}</button> : 'Unavailable'}</p>
      <p>Applicant: <Party party={record.applicant} onOpen={onOpenUser} /></p>
      <p>Poster: <Party party={record.poster} onOpen={onOpenUser} /></p>
      {record.engagement ? <p><button type="button" onClick={() => onOpenEngagement(record.engagement!.id)}>Engagement {labelWord(record.engagement.status)}</button></p> : <p>No engagement</p>}
    </section>
  )
}

function EngagementDetail({ record, onOpenUser, onOpenJob, onOpenService, onOpenApplication, onOpenDispute }: { record: StaffEngagementDetail; onOpenUser: (id: string) => void; onOpenJob: (id: string) => void; onOpenService: (id: string) => void; onOpenApplication: (id: string) => void; onOpenDispute: (id: string) => void }) {
  return (
    <section className="demo-list">
      <p>{labelWord(record.status)} · {labelWord(record.source)}{record.deletedAt ? ' · Deleted' : ''}</p>
      <p>Client: <Party party={record.client} onOpen={onOpenUser} /> · Provider: <Party party={record.provider} onOpen={onOpenUser} /></p>
      <Payment item={record.payment} />
      {record.listing ? <p><button type="button" onClick={() => onOpenJob(record.listing!.id)}>{record.listing.title}</button></p> : null}
      {record.serviceOffering ? <p><button type="button" onClick={() => onOpenService(record.serviceOffering!.id)}>{record.serviceOffering.title}</button></p> : null}
      {record.applicationId ? <p><button type="button" onClick={() => onOpenApplication(record.applicationId!)}>View application</button></p> : null}
      {record.disputeLink ? <p><button type="button" onClick={() => onOpenDispute(record.disputeLink!)}>View dispute</button></p> : null}
    </section>
  )
}

function Party({ party, onOpen }: { party: StaffParty | null; onOpen: (id: string) => void }) {
  if (!party) return <>Unavailable</>
  return <button type="button" onClick={() => onOpen(party.id)}>{party.displayName}{party.deleted ? ' (deleted)' : ''}</button>
}

function Payment({ item }: { item: StaffEngagementListItem['payment'] }) {
  if (!item) return <p>No payment is recorded.</p>
  return <p>{item.simulated ? 'Simulated' : 'Payment'} {item.amount} {item.currency} · {item.status}</p>
}

function labelTab(tab: MarketplaceTab): string {
  if (tab === 'jobs') return 'jobs'
  if (tab === 'services') return 'services'
  if (tab === 'applications') return 'applications'
  return 'engagements'
}

function labelWord(value: string): string {
  return value.replaceAll('_', ' ')
}
