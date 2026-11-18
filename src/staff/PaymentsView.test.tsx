import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_PAYMENTS, type PaymentsQuery, type StaffFollowUpPage, type StaffPaymentLedgerPage } from './adminTypes'
import { PaymentsView } from './PaymentsView'

const engagement = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Retained work',
  status: 'cancelled',
  closedByMawahib: false,
  cancelledByMawahib: true,
  deleted: true,
}

const attempts: StaffPaymentLedgerPage = {
  totalAttempts: 2,
  matchCount: 2,
  nextCursor: null,
  items: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      amount: '30.00',
      currency: 'SAR',
      status: 'succeeded',
      simulated: true,
      referencedByProvider: true,
      createdAt: '2026-11-18T00:00:00.000Z',
      succeededAt: '2026-11-17T00:00:00.000Z',
      failedAt: null,
      payer: { id: 'payer', displayName: 'Deleted user', deleted: true },
      payee: { id: 'payee', displayName: 'Payee', deleted: false },
      engagement,
      invoice: {
        id: 'invoice',
        invoiceNumber: 'MWH-2026-000010',
        issuedAt: '2026-11-17T01:00:00.000Z',
        amount: '30.00',
        currency: 'SAR',
        status: 'generated',
        simulated: true,
        hasDocument: true,
        retryable: false,
        retryUnavailableReason: null,
      },
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      amount: '15.00',
      currency: 'AED',
      status: 'failed',
      simulated: true,
      referencedByProvider: false,
      createdAt: '2026-11-18T00:00:00.000Z',
      succeededAt: null,
      failedAt: '2026-11-18T02:00:00.000Z',
      payer: { id: 'payer', displayName: 'Deleted user', deleted: true },
      payee: { id: 'payee', displayName: 'Payee', deleted: false },
      engagement,
      invoice: null,
    },
  ],
}

const followUps: StaffFollowUpPage = {
  totalRecords: 2,
  matchCount: 2,
  nextCursor: 'next-follow',
  items: [
    {
      id: 'follow-open',
      state: 'outstanding',
      outcome: null,
      note: null,
      recordedAt: null,
      recordedByStaffLabel: null,
      createdAt: '2026-11-18T03:00:00.000Z',
      engagement,
    },
    {
      id: 'follow-done',
      state: 'recorded',
      outcome: 'no_real_funds',
      note: 'Plain staff note',
      recordedAt: '2026-11-18T04:00:00.000Z',
      recordedByStaffLabel: 'staff@example.com',
      createdAt: '2026-11-18T03:00:00.000Z',
      engagement,
    },
  ],
}

function renderPayments(
  query: PaymentsQuery = EMPTY_PAYMENTS,
  onRetry: (id: string) => Promise<{ ok: false; message: string }> = async () => ({ ok: false, message: 'The invoice could not be retried. Refresh the page before trying again.' }),
  page: StaffPaymentLedgerPage = attempts,
) {
  const onChange = vi.fn()
  const onOpenEngagement = vi.fn()
  const view = render(
    <PaymentsView
      query={query}
      attempts={page}
      followUps={followUps}
      phase="ready"
      onChange={onChange}
      onOpenUser={() => undefined}
      onOpenEngagement={onOpenEngagement}
      onViewInvoice={async () => ({ url: 'https://files.example.test/invoice.pdf', originalFileName: 'invoice.pdf' })}
      onRetryInvoice={onRetry}
    />,
  )
  return { onChange, onOpenEngagement, onRetry, ...view }
}

afterEach(() => {
  cleanup()
})

describe('PaymentsView', () => {
  it('keeps every attempt and separates a missing invoice from an empty list', () => {
    renderPayments()
    expect(screen.getByText('Succeeded')).toBeTruthy()
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
    expect(screen.getByText('Invoice MWH-2026-000010')).toBeTruthy()
    expect(screen.getByText('No invoice issued')).toBeTruthy()
    expect(screen.getByText('Total attempts: 2')).toBeTruthy()
    expect(screen.getByText('Matching attempts: 2')).toBeTruthy()
    expect(screen.getAllByText('Simulated — no real payment').length).toBeGreaterThan(0)
    expect(screen.getByText('Provider reference recorded')).toBeTruthy()
    expect(screen.getByText('No provider reference')).toBeTruthy()
    expect(screen.getAllByText('Deleted user (deleted)').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cancelled by Mawahib · Deleted/).length).toBeGreaterThan(0)
    expect(screen.queryByText('secret-provider-reference')).toBeNull()
    expect(screen.queryByText('Historical Payer')).toBeNull()
  })

  it('keeps the retry label stable and does not change the payment when retry is uncertain', async () => {
    let finish: (value: { ok: false; message: string }) => void = () => undefined
    const onRetry = vi.fn(() => new Promise<{ ok: false; message: string }>((resolve) => {
      finish = resolve
    }))
    const retryable = {
      ...attempts,
      items: attempts.items.map((item) => item.status === 'failed'
        ? {
            ...item,
            invoice: {
              id: 'invoice-retry',
              invoiceNumber: 'MWH-2026-000011',
              issuedAt: null,
              amount: '15.00',
              currency: 'AED',
              status: 'failed',
              simulated: true,
              hasDocument: false,
              retryable: true,
              retryUnavailableReason: null,
            },
          }
        : item),
    }
    renderPayments(EMPTY_PAYMENTS, onRetry, retryable)
    expect(screen.getByRole('button', { name: 'View invoice' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy()
    const retry = screen.getByRole('button', { name: 'Retry invoice' })
    fireEvent.click(retry)
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Retry invoice' }).getAttribute('aria-busy')).toBe('true')
    finish({ ok: false, message: 'The invoice could not be retried. Refresh the page before trying again.' })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'The invoice could not be retried. Refresh the page before trying again.')
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
  })

  it('links follow-up to the engagement and shows a recorded note as text', () => {
    const { onOpenEngagement, onChange } = renderPayments()
    expect(screen.getByText('Outstanding')).toBeTruthy()
    expect(screen.getByText('Plain staff note')).toBeTruthy()
    expect(screen.getByText('No real funds')).toBeTruthy()
    expect(screen.getByText(/does not confirm a provider refund or payout/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Retained work' })[0])
    expect(onOpenEngagement).toHaveBeenCalledWith(engagement.id)
    fireEvent.click(screen.getByRole('button', { name: 'Next follow-up records' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ followCursor: 'next-follow', cursor: null }))
  })
})
