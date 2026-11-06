import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createAdminRecords } from './staff/adminApi'
import { StaffPortal } from './staff/StaffPortal'
import { createStaffAccessClient } from './staff/staffAccess'
import { createBrowserStaffAuth } from './staff/supabaseAuth'
import './staff/staff.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root')

const search = new URLSearchParams(window.location.search)
const preview = import.meta.env.DEV ? search.get('preview') : null
const demo = import.meta.env.DEV ? search.get('demo') : null

if (preview) {
  const { mountPreview } = await import('./preview')
  mountPreview(root, preview)
} else {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const api = import.meta.env.VITE_API_BASE_URL?.trim()
  const configured = Boolean(url && key && api)
  if (import.meta.env.DEV && (demo || !configured)) {
    const { mountDemo } = await import('./demo/mount')
    mountDemo(root)
  } else if (!configured) {
    createRoot(root).render(
      <StrictMode>
        <ConfigurationMissing />
      </StrictMode>,
    )
  } else {
    const auth = createBrowserStaffAuth(url as string, key as string)
    createRoot(root).render(
      <StrictMode>
        <StaffPortal
          auth={auth}
          access={createStaffAccessClient(api as string)}
          records={createAdminRecords(api as string, async () => (await auth.getSession()).accessToken)}
          onEnterDemo={import.meta.env.DEV ? () => {
            const next = new URL(window.location.href)
            next.searchParams.set('demo', '1')
            window.location.assign(next.toString())
          } : undefined}
        />
      </StrictMode>,
    )
  }
}

function ConfigurationMissing() {
  return (
    <main className="shell">
      <section className="card">
        <p className="brand">Mawahib</p>
        <h1>Portal configuration required</h1>
        <p>This portal needs its public Supabase and API addresses before it can start. No staff access is granted from this screen.</p>
      </section>
    </main>
  )
}
