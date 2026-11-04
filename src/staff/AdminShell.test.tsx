import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminShell } from './AdminShell'
import type { AdminRecords, StaffDispute, StaffUserSummary } from './adminTypes'

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
      return { ok: true, data: { items: [user], nextCursor: 'page-2' } }
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
        },
      }
    },
    async disputes() {
      return { ok: true, data: { items: [dispute], nextCursor: null } }
    },
    async dispute() {
      return { ok: true, data: dispute }
    },
    ...partial,
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
              data: { items: [{ ...user, displayName: cursor ? 'Page Two' : 'Ada Preview' }], nextCursor: cursor ? null : 'page-2' },
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

  it('shows an empty search and a service failure without invented records', async () => {
    const empty = render(
      <AdminShell
        records={records({
          async searchUsers() {
            return { ok: true, data: { items: [], nextCursor: null } }
          },
        })}
        initialRoute={{ name: 'users', query: 'nobody', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByText('No accounts match that search.')).toBeTruthy()
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
            return { ok: true, data: { items: [{ ...user, email: 'current@example.com', displayName: 'Current Result' }], nextCursor: null } }
          },
        })}
        initialRoute={{ name: 'users', query: 'old', cursor: null }}
        onSignOut={() => undefined}
      />,
    )
    expect(await screen.findByRole('heading', { name: 'Loading records' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Email, username, or account id'), { target: { value: 'current' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('Current Result')).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: true, data: { items: [user], nextCursor: null } })
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
    expect(await screen.findByRole('heading', { name: 'Loading records' })).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: false, kind: 'denied' })
    })
    expect(screen.getByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull()
    expect(screen.queryByText('Synthetic dispute note')).toBeNull()
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
              return { ok: true, data: { items: [{ ...user, displayName: 'Current Result' }], nextCursor: null } }
            },
          })}
          initialRoute={{ name: 'users', query: 'late', cursor: null }}
          onSignOut={() => setOpen(false)}
        />
      )
    }
    render(<Session />)
    expect(await screen.findByRole('heading', { name: 'Loading records' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByText('Signed out')).toBeTruthy()
    await act(async () => {
      resolveLate({ ok: true, data: { items: [user], nextCursor: null } })
    })
    expect(screen.queryByText('Ada Preview')).toBeNull()
  })
})
