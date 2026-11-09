import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminShell } from './AdminShell'
import type { AdminRecords, OperationsOverview, StaffDispute, StaffUserSummary } from './adminTypes'
import { OPERATIONS_POLL_MS } from './OperationsView'

const user: StaffUserSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ada.preview@example.com',
  username: 'ada-preview',
  displayName: 'Ada Preview',
  accountType: 'talent',
  accountStatus: 'ACTIVE',
  createdAt: '2026-01-04T00:00:00.000Z',
  deletedAt: null,
}

const dispute: StaffDispute = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Preview poster',
  status: 'disputed',
  updatedAt: '2026-02-02T00:00:00.000Z',
  deletedAt: null,
  clientDisplayName: 'Ada Preview',
  providerDisplayName: 'Nour Preview',
  disputeEventId: '33333333-3333-4333-8333-333333333333',
  disputeAt: '2026-02-02T00:00:00.000Z',
  disputeNote: 'Synthetic dispute note',
  payment: { amount: '150.00', currency: 'SAR', status: 'succeeded', simulated: true },
}

function records(partial: Partial<AdminRecords> = {}): AdminRecords {
  return {
    async searchUsers() {
      return { ok: true as const, data: { items: [user], nextCursor: 'page-2', totalUsers: 3, matchCount: 1 } }
    },
    async user() {
      return {
        ok: true,
        data: {
          ...user,
          followersCount: 1,
          followingCount: 1,
          postsCount: 1,
          clientEngagementCount: 1,
          providerEngagementCount: 1,
          simulatedPaymentCount: 1,
          statusAction: 'suspend',
        },
      }
    },
    async setAccountStatus() {
      return { ok: true, data: { outcome: 'changed', accountStatus: 'SUSPENDED' as const } }
    },
    async accountActions() {
      return { ok: true, data: { items: [], nextCursor: null } }
    },
    async disputes() {
      return { ok: true, data: { items: [dispute], nextCursor: null } }
    },
    async dispute() {
      return { ok: true, data: dispute }
    },
    async operations() {
      return { ok: true, data: operationsOverview() }
    },
    async reportSummary() {
      return { ok: true as const, data: { openReports: 4, totalReports: 9 } }
    },
    async reports() {
      return { ok: true, data: { items: [], nextCursor: null, matchCount: 0 } }
    },
    async report() {
      return { ok: false as const, kind: 'not-found' as const }
    },
    async setReportStatus() {
      return { ok: true as const, data: { id: 'report', status: 'resolved' } }
    },
    async setContentVisibility() {
      return { ok: false as const, kind: 'unavailable' as const }
    },
    async jobs() {
      return { ok: true as const, data: { items: [], nextCursor: null, total: 0, matchCount: 0 } }
    },
    async job() {
      return { ok: false as const, kind: 'not-found' as const }
    },
    async services() {
      return { ok: true as const, data: { items: [], nextCursor: null, total: 0, matchCount: 0 } }
    },
    async service() {
      return { ok: false as const, kind: 'not-found' as const }
    },
    async applications() {
      return { ok: true as const, data: { items: [], nextCursor: null, total: 0, matchCount: 0 } }
    },
    async application() {
      return { ok: false as const, kind: 'not-found' as const }
    },
    async engagements() {
      return { ok: true as const, data: { items: [], nextCursor: null, total: 0, matchCount: 0 } }
    },
    async engagement() {
      return { ok: false as const, kind: 'not-found' as const }
    },
    ...partial,
  }
}

function operationsOverview(patch: Partial<OperationsOverview['cards'][number]>[] = []): OperationsOverview {
  const titles = ['API deployment', 'Database connectivity', 'Supabase project', 'Database backup', 'Production monitor'] as const
  const ids = ['railway', 'database', 'supabase_project', 'supabase_backup', 'uptime'] as const
  return {
    generatedAt: '2026-11-05T10:00:00.000Z',
    cards: ids.map((id, index) => ({
      id,
      title: titles[index],
      state: 'up',
      stale: false,
      fetchedAt: '2026-11-05T09:59:00.000Z',
      eventAt: '2026-11-05T09:00:00.000Z',
      summary: `${titles[index]} synthetic reading`,
      details: [],
      incidents: [],
      dashboardUrl: 'https://railway.com/dashboard',
      ...patch[index],
    })),
  }
}

afterEach(() => {
  cleanup()
})

describe('AdminShell', () => {
  it('searches, opens an account, and pages forward', async () => {
    const seen: Array<string | null> = []
    render(
      <AdminShell
        records={records({
          async searchUsers(_query, cursor) {
            seen.push(cursor)
            return {
              ok: true,
              data: { items: [{ ...user, displayName: cursor ? 'Page Two' : 'Ada Preview' }], nextCursor: cursor ? null : 'page-2', totalUsers: 3, matchCount: 2 },
            }
          },
        })}
        initialRoute={{ name: 'users', query: 'ada', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeTruthy()
    expect(screen.getByText('ada.preview@example.com')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page Two')).toBeTruthy()
    expect(seen).toEqual([null, 'page-2'])
    fireEvent.click(screen.getByRole('button', { name: 'View account' }))
    expect(await screen.findByText('Simulated payments: 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeTruthy()
  })

  it('does not show zero users when the list cannot be loaded', async () => {
    render(
      <AdminShell
        records={records({
          async searchUsers() {
            return { ok: false, kind: 'unavailable' }
          },
        })}
        initialRoute={{ name: 'users', query: '', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('The staff service is temporarily unavailable. Try again.')).toBeTruthy()
    expect(screen.queryByText(/Total users: 0/)).toBeNull()
  })

  it('shows an empty search and a service failure without invented records', async () => {
    const empty = render(
      <AdminShell
        records={records({
          async searchUsers() {
            return { ok: true, data: { items: [], nextCursor: null, totalUsers: 4, matchCount: 0 } }
          },
        })}
        initialRoute={{ name: 'users', query: 'nobody', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('No accounts match that search.')).toBeTruthy()
    expect(screen.getByText('Total users: 4')).toBeTruthy()
    expect(screen.getByText('Matching accounts: 0')).toBeTruthy()
    empty.unmount()

    render(
      <AdminShell
        records={records({
          async disputes() {
            return { ok: false, kind: 'unavailable' }
          },
        })}
        initialRoute={{ name: 'disputes', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('The staff service is temporarily unavailable. Try again.')).toBeTruthy()
    expect(screen.queryByText('Preview poster')).toBeNull()
  })

  it('labels a simulated dispute payment and denies access without keeping the record', async () => {
    const first = render(
      <AdminShell records={records()} initialRoute={{ name: 'dispute', id: dispute.id }} onSignOut={() => undefined} />,
    )
    expect(await screen.findByText('Simulated 150.00 SAR · succeeded')).toBeTruthy()
    expect(screen.getByText('Synthetic dispute note')).toBeTruthy()
    first.unmount()

    render(
      <AdminShell
        records={records({
          async searchUsers() {
            return { ok: false, kind: 'denied' }
          },
        })}
        initialRoute={{ name: 'users', query: 'ada', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByText('Ada Preview')).toBeNull()
  })

  it('keeps the newer search when an older one returns later', async () => {
    let resolveLate: (value: Awaited<ReturnType<AdminRecords['searchUsers']>>) => void = () => undefined
    render(
      <AdminShell
        records={records({
          async searchUsers(query) {
            if (query === 'old') {
              return new Promise((resolve) => {
                resolveLate = resolve
              })
            }
            return { ok: true, data: { items: [{ ...user, email: 'current@example.com', displayName: 'Current Result' }], nextCursor: null, totalUsers: 3, matchCount: 1 } }
          },
        })}
        initialRoute={{ name: 'users', query: 'old', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Loading records' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Name, username, email, or account id'), { target: { value: 'current' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('Current Result')).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: true, data: { items: [user], nextCursor: null, totalUsers: 3, matchCount: 1 } })
    })
    expect(screen.getByText('Current Result')).toBeTruthy()
    expect(screen.queryByText('Ada Preview')).toBeNull()
  })

  it('leaves the records screen when access is denied and ignores a late result', async () => {
    let resolveLate: (value: Awaited<ReturnType<AdminRecords['dispute']>>) => void = () => undefined
    function Session() {
      const [denied, setDenied] = useState(false)
      if (denied) return <p>Staff access is not active for this account. Contact your administrator.</p>
      return (
        <AdminShell
          records={records({
            async dispute() {
              return new Promise((resolve) => {
                resolveLate = resolve
              })
            },
          })}
          initialRoute={{ name: 'dispute', id: dispute.id }}
          onSignOut={() => undefined}
          onAccessDenied={() => setDenied(true)}
        />
      )
    }
    render(<Session />)
    expect(await screen.findByRole('heading', { name: 'Disputes' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Loading records' })).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: false, kind: 'denied' })
    })
    expect(screen.getByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull()
    expect(screen.queryByText('Synthetic dispute note')).toBeNull()
  })

  it('confirms a suspension and ignores a second click while it is saving', async () => {
    let calls = 0
    let release: () => void = () => undefined
    render(
      <AdminShell
        records={records({
          async setAccountStatus() {
            calls += 1
            await new Promise<void>((resolve) => {
              release = resolve
            })
            return { ok: true, data: { outcome: 'changed', accountStatus: 'SUSPENDED' } }
          },
          async user() {
            calls += 0
            const suspended = calls > 0
            return {
              ok: true,
              data: {
                ...user,
                accountStatus: suspended ? 'SUSPENDED' : 'ACTIVE',
                statusAction: suspended ? 'restore' : 'suspend',
                followersCount: 1,
                followingCount: 1,
                postsCount: 1,
                clientEngagementCount: 1,
                providerEngagementCount: 1,
                simulatedPaymentCount: 1,
              },
            }
          },
        })}
        initialRoute={{ name: 'user', id: user.id }}
        onSignOut={() => undefined}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  Review hold  ' } })
    const confirm = screen.getByRole('button', { name: 'Confirm suspend' })
    confirm.click()
    confirm.click()
    expect(calls).toBe(1)
    await act(async () => release())
    expect(await screen.findByText('The account is now suspended.')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeTruthy()
  })

  it('does not attribute a reconciled status to this request', async () => {
    render(
      <AdminShell
        records={records({
          async setAccountStatus() {
            return { ok: true, data: { outcome: 'observed', accountStatus: 'SUSPENDED' } }
          },
        })}
        initialRoute={{ name: 'user', id: user.id }}
        startConfirming
        onSignOut={() => undefined}
      />,
    )
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'Review hold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm suspend' }))
    expect(await screen.findByText('The account is currently suspended.')).toBeTruthy()
    expect(screen.queryByText('The account is now suspended.')).toBeNull()
  })

  it('shows a conflict and an unknown result without treating them as success', async () => {
    const conflict = render(
      <AdminShell
        records={records({
          async setAccountStatus() {
            return { ok: false, kind: 'conflict' }
          },
        })}
        initialRoute={{ name: 'user', id: user.id }}
        startConfirming
        onSignOut={() => undefined}
      />,
    )
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'Review hold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm suspend' }))
    expect(await screen.findByText('This account changed. Refresh it before trying again.')).toBeTruthy()
    conflict.unmount()

    render(
      <AdminShell
        records={records({
          async setAccountStatus() {
            return { ok: false, kind: 'uncertain' }
          },
        })}
        initialRoute={{ name: 'user', id: user.id }}
        startConfirming
        onSignOut={() => undefined}
      />,
    )
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'Review hold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm suspend' }))
    expect(await screen.findByText('The result is unknown. Refresh the account before trying again.')).toBeTruthy()
  })

  it('clears the account when action history is denied', async () => {
    function Session() {
      const [denied, setDenied] = useState(false)
      if (denied) return <p>Staff access is not active for this account. Contact your administrator.</p>
      return (
        <AdminShell
          records={records({
            async accountActions() {
              return { ok: false, kind: 'denied' }
            },
          })}
          initialRoute={{ name: 'user', id: user.id }}
          onSignOut={() => undefined}
          onAccessDenied={() => setDenied(true)}
        />
      )
    }
    render(<Session />)
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByText('ada.preview@example.com')).toBeNull()
  })

  it('renders a dispute note as text', async () => {
    const markup = '<img src="x" onerror="alert(1)">'
    render(
      <AdminShell
        records={records({
          async dispute() {
            return { ok: true, data: { ...dispute, disputeNote: markup } }
          },
        })}
        initialRoute={{ name: 'dispute', id: dispute.id }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText(markup)).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('drops a late search after sign-out', async () => {
    let resolveLate: (value: Awaited<ReturnType<AdminRecords['searchUsers']>>) => void = () => undefined
    function Session() {
      const [open, setOpen] = useState(true)
      if (!open) return <p>Signed out</p>
      return (
        <AdminShell
          records={records({
            async searchUsers(query) {
              if (query === 'late') {
                return new Promise((resolve) => {
                  resolveLate = resolve
                })
              }
              return { ok: true, data: { items: [{ ...user, displayName: 'Current Result' }], nextCursor: null, totalUsers: 3, matchCount: 1 } }
            },
          })}
          initialRoute={{ name: 'users', query: 'late', cursor: null }}
          onSignOut={() => setOpen(false)}
        />
      )
    }
    render(<Session />)
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Loading records' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Sign out?' })).getByRole('button', { name: 'Sign out' }))
    expect(screen.getByText('Signed out')).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: true, data: { items: [user], nextCursor: null, totalUsers: 3, matchCount: 1 } })
    })
    expect(screen.queryByText('Ada Preview')).toBeNull()
  })

  it('labels unknown and down separately, and keeps stale data from looking current', async () => {
    render(
      <AdminShell
        records={records({
          async operations() {
            return {
              ok: true,
              data: operationsOverview([
                { state: 'unknown', summary: 'No deployment was returned for the configured service.' },
                { state: 'up', stale: true, summary: 'The application database accepted a connectivity check.' },
                { state: 'down', summary: 'Supabase reports this project as ACTIVE_UNHEALTHY.' },
                { state: 'not_configured', fetchedAt: null, summary: 'Not configured.' },
                {
                  state: 'down',
                  summary: 'UptimeRobot reports this monitor as DOWN.',
                  incidents: [{ at: '2026-11-05T09:40:00.000Z', label: 'DOWN' }],
                  dashboardUrl: 'javascript:alert(1)',
                },
              ]),
            }
          },
        })}
        initialRoute={{ name: 'operations' }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Monitoring' })).toBeTruthy()
    expect(screen.getByText('Unknown')).toBeTruthy()
    expect(screen.getAllByText('Down')).toHaveLength(2)
    expect(screen.getByText('Stale')).toBeTruthy()
    expect(screen.getByText('Current status could not be verified. This reading is not current.')).toBeTruthy()
    expect(screen.getByText('Not configured')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Incidents on the first page', level: 4 })).toBeTruthy()
    const dashboards = screen.getAllByRole('link', { name: /Open the provider dashboard/ })
    expect(dashboards.length).toBeGreaterThan(0)
    expect(dashboards.every((link) => link.getAttribute('target') === '_blank' && link.getAttribute('rel') === 'noopener noreferrer' && link.textContent?.includes('opens in a new tab'))).toBe(true)
    expect(screen.getAllByRole('link').every((link) => link.getAttribute('href')?.startsWith('https://'))).toBe(true)
    expect(OPERATIONS_POLL_MS).toBe(60_000)
  })

  it('clears an operations reading when access is denied and ignores the late payload', async () => {
    let resolveLate: (value: Awaited<ReturnType<AdminRecords['operations']>>) => void = () => undefined
    function Session() {
      const [denied, setDenied] = useState(false)
      if (denied) return <p>Staff access is not active for this account. Contact your administrator.</p>
      return (
        <AdminShell
          records={records({
            async operations() {
              return new Promise((resolve) => {
                resolveLate = resolve
              })
            },
          })}
          initialRoute={{ name: 'operations' }}
          onSignOut={() => undefined}
          onAccessDenied={() => setDenied(true)}
        />
      )
    }
    render(<Session />)
    expect(await screen.findByRole('heading', { name: 'Monitoring' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Loading records' })).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: false, kind: 'denied' })
    })
    expect(screen.getByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Monitoring' })).toBeNull()
  })

  it('ignores an operations response after the screen has changed', async () => {
    let resolveLate: (value: Awaited<ReturnType<AdminRecords['operations']>>) => void = () => undefined
    render(
      <AdminShell
        records={records({
          async operations() {
            return new Promise((resolve) => {
              resolveLate = resolve
            })
          },
        })}
        initialRoute={{ name: 'operations' }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Monitoring' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Loading records' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(await screen.findByText('Ada Preview')).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: true, data: operationsOverview([{ summary: 'Late railway reading' }]) })
    })
    expect(screen.queryByText('Late railway reading')).toBeNull()
  })

  it('asks the server again from the operations summary', async () => {
    let calls = 0
    render(
      <AdminShell
        records={records({
          async operations() {
            calls += 1
            return {
              ok: true,
              data: operationsOverview([{ summary: calls === 1 ? 'First reading' : 'Second reading' }]),
            }
          },
        })}
        initialRoute={{ name: 'operations' }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('First reading')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('Second reading')).toBeTruthy()
    expect(calls).toBe(2)
  })

  it('derives the monitoring shortcut from the readings', async () => {
    const { unmount } = render(
      <AdminShell
        records={records({
          async operations() {
            return {
              ok: true,
              data: operationsOverview([
                { state: 'not_configured', summary: 'Deployment status is not set up.' },
                { state: 'up' },
                { state: 'not_configured' },
                { state: 'not_available' },
                { state: 'not_configured' },
              ]),
            }
          },
        })}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('Setup incomplete')).toBeTruthy()
    expect(screen.getByText(/A missing integration is not an outage/)).toBeTruthy()
    unmount()

    render(
      <AdminShell
        records={records({
          async operations() {
            return { ok: true, data: operationsOverview([{ state: 'down', summary: 'UptimeRobot reports this monitor as DOWN.' }]) }
          },
        })}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('Needs attention')).toBeTruthy()
    expect(screen.getByText('1 reading failed. That is not a service outage.')).toBeTruthy()
    unmount()

    render(
      <AdminShell
        records={records({
          async operations() {
            return {
              ok: true,
              data: operationsOverview([
                {},
                {},
                {},
                {},
                { state: 'down', summary: 'UptimeRobot reports this monitor as DOWN.' },
              ]),
            }
          },
        })}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('Outage reported')).toBeTruthy()
    expect(screen.getByText('The production monitor reports a service outage.')).toBeTruthy()
  })

  it('shows placeholders instead of demo records and does not invent overview totals', async () => {
    render(<AdminShell records={records()} onSignOut={() => undefined} />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    expect(screen.getByText('Total users')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Open reports')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('9 total reports')).toBeTruthy()
    expect(screen.getByText('View open disputes')).toBeTruthy()
    expect(screen.getByText('Total not available')).toBeTruthy()
    expect(screen.getByText('Readings current')).toBeTruthy()
    expect(screen.queryByText('Not connected')).toBeNull()
    expect(screen.queryByText(/^0$/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Marketplace' }))
    expect(await screen.findByRole('heading', { name: 'Marketplace' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Jobs' })).toBeTruthy()
    expect(screen.getByText('No jobs match these filters.')).toBeTruthy()
    expect(screen.getByText('Total jobs: 0')).toBeTruthy()
    expect(screen.queryByText('Omar Al-Harbi')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'All targets' })).toBeTruthy()
    expect(screen.getByText('No reports match these filters.')).toBeTruthy()
    expect(screen.getByText('Matching reports: 0')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Payments' }))
    expect(await screen.findByText(/Payment and invoice lists are not connected/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Staff' }))
    expect(await screen.findByText(/operator commands/)).toBeTruthy()
  })

  it('keeps report filters mounted and drops a late response', async () => {
    let resolveFirst: (value: { ok: true; data: { items: []; nextCursor: null; matchCount: number } }) => void = () => undefined
    const first = new Promise<{ ok: true; data: { items: []; nextCursor: null; matchCount: number } }>((resolve) => {
      resolveFirst = resolve
    })
    let calls = 0
    render(<AdminShell records={records({
      async reports() {
        calls += 1
        if (calls === 1) return first
        return { ok: true, data: { items: [], nextCursor: null, matchCount: 2 } }
      },
    })} onSignOut={() => undefined} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reports' }))
    expect(await screen.findByRole('button', { name: 'Open' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('checkbox', { name: 'Resolved' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('checkbox', { name: 'Resolved' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Resolved' }))
    expect(await screen.findByText('Matching reports: 2')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeTruthy()
    await act(async () => {
      resolveFirst({ ok: true, data: { items: [], nextCursor: null, matchCount: 99 } })
    })
    expect(screen.queryByText('Matching reports: 99')).toBeNull()
    expect(screen.getByText('Matching reports: 2')).toBeTruthy()
  })
})
