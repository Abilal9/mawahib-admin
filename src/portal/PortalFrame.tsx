import type { ReactNode } from 'react'
import '../demo/demo.css'

export const PORTAL_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'reports', label: 'Reports' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'payments', label: 'Payments' },
  { id: 'operations', label: 'Monitoring' },
  { id: 'staff', label: 'Staff' },
] as const

export type PortalSection = (typeof PORTAL_SECTIONS)[number]['id']

export function PortalFrame({
  current,
  title,
  banner,
  onNavigate,
  onSignOut,
  signOutLabel,
  showBack = false,
  onBack,
  children,
}: {
  current: PortalSection
  title: string
  banner?: string | null
  onNavigate: (section: PortalSection) => void
  onSignOut: () => void
  signOutLabel: string
  showBack?: boolean
  onBack?: () => void
  children: ReactNode
}) {
  return (
    <div className="demo-app">
      <aside className="demo-side">
        <p className="brand">Mawahib</p>
        <nav aria-label="Portal sections">
          {PORTAL_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="secondary" onClick={onSignOut}>
          {signOutLabel}
        </button>
      </aside>
      <main className="demo-main">
        {banner ? <p className="demo-banner">{banner}</p> : null}
        <header className="demo-header">
          <div>
            <p className="demo-kicker">Internal oversight</p>
            <h1 id="portal-title">{title}</h1>
          </div>
          {showBack && onBack ? (
            <button type="button" className="secondary" onClick={onBack}>
              Back
            </button>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  )
}
