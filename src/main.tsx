import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createAdminRecords } from './staff/adminApi'
import { StaffPortal } from './staff/StaffPortal'
import { createStaffAccessClient } from './staff/staffAccess'
import { createBrowserStaffAuth } from './staff/supabaseAuth'
import './staff/staff.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root')

const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null

if (preview) {
  const { mountPreview } = await import('./preview')
  mountPreview(root, preview)
} else {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const api = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!url || !key || !api) {
    createRoot(root).render(
      <StrictMode>
        <ConfigurationMissing />
      </StrictMode>,
    )
  } else {
    const auth = createBrowserStaffAuth(url, key)
    createRoot(root).render(
      <StrictMode>
        <StaffPortal
          auth={auth}
          access={createStaffAccessClient(api)}
          records={createAdminRecords(api, async () => (await auth.getSession()).accessToken)}
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
