import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ReportDetail, ReportsList } from './ReportsView'
import { showRelatedReports } from './relatedReports'
import type { AdminRecords, StaffReportDetail, StaffReportSummary, TargetReportCounts } from './adminTypes'

const counts = (totalReportCount: number, openReportCount = 0, uniqueReporterCount = 1): TargetReportCounts => ({
  openReportCount,
  totalReportCount,
  uniqueReporterCount,
})

describe('showRelatedReports', () => {
  it('uses only the total across all statuses', () => {
    expect(showRelatedReports(counts(2, 0, 1))).toBe(true)
    expect(showRelatedReports(counts(1, 4, 9))).toBe(false)
    expect(showRelatedReports(null)).toBe(false)
  })
})

const summary = (total: number | null): StaffReportSummary => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  targetType: 'post',
  targetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  reason: 'spam',
  status: 'open',
  createdAt: '2026-11-08T00:00:00.000Z',
  statusChangedAt: null,
  hasDetails: false,
  targetCounts: total === null ? null : counts(total),
  reportedUser: null,
})

describe('report action buttons', () => {
  it('shows the related-reports button only when another report exists and keeps navigation', () => {
    const onRelated = vi.fn()
    const onOpen = vi.fn()
    const { rerender } = render(
      <ReportsList
        items={[summary(2)]}
        statuses={['open']}
        targetTypes={[]}
        exactTarget={null}
        nextCursor={null}
        matchCount={1}
        phase="ready"
        onFilter={() => undefined}
        onClearTarget={() => undefined}
        onReset={() => undefined}
        onOpen={onOpen}
        onRelated={onRelated}
        onMore={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: 'View report' }).className).toContain('report-open')
    const related = screen.getByRole('button', { name: 'View related reports' })
    expect(related.className).toContain('report-related')
    fireEvent.click(related)
    expect(onRelated).toHaveBeenCalledWith('post', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    fireEvent.click(screen.getByRole('button', { name: 'View report' }))
    expect(onOpen).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    rerender(
      <ReportsList
        items={[summary(1)]}
        statuses={['open']}
        targetTypes={[]}
        exactTarget={null}
        nextCursor={null}
        matchCount={1}
        phase="ready"
        onFilter={() => undefined}
        onClearTarget={() => undefined}
        onReset={() => undefined}
        onOpen={onOpen}
        onRelated={onRelated}
        onMore={() => undefined}
      />,
    )
    expect(screen.queryByRole('button', { name: 'View related reports' })).toBeNull()
    expect(screen.getByRole('button', { name: 'View report' })).toBeTruthy()

    rerender(
      <ReportsList
        items={[summary(null)]}
        statuses={['open']}
        targetTypes={[]}
        exactTarget={null}
        nextCursor={null}
        matchCount={1}
        phase="ready"
        onFilter={() => undefined}
        onClearTarget={() => undefined}
        onReset={() => undefined}
        onOpen={onOpen}
        onRelated={onRelated}
        onMore={() => undefined}
      />,
    )
    expect(screen.queryByRole('button', { name: 'View related reports' })).toBeNull()
  })

  it('hides related reports on the detail while the total is one or unavailable', () => {
    const onRelated = vi.fn()
    const report = (total: number | null): StaffReportDetail => ({
      ...summary(total),
      details: null,
      reporter: null,
      target: { state: 'available' },
      contentModeration: null,
      history: [],
    })
    const { rerender } = render(
      <ReportDetail report={report(3)} records={{} as AdminRecords} onChanged={() => undefined} onOpenAccount={() => undefined} onRelated={onRelated} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'View related reports' }))
    expect(onRelated).toHaveBeenCalledTimes(1)
    rerender(
      <ReportDetail report={report(1)} records={{} as AdminRecords} onChanged={() => undefined} onOpenAccount={() => undefined} onRelated={onRelated} />,
    )
    expect(screen.queryByRole('button', { name: 'View related reports' })).toBeNull()
    rerender(
      <ReportDetail report={report(null)} records={{} as AdminRecords} onChanged={() => undefined} onOpenAccount={() => undefined} onRelated={onRelated} />,
    )
    expect(screen.queryByRole('button', { name: 'View related reports' })).toBeNull()
  })
})
