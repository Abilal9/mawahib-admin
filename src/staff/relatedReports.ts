import type { TargetReportCounts } from './adminTypes'

/** The current report is not a related report. Hide the action while counts are missing. */
export function showRelatedReports(counts: TargetReportCounts | null): boolean {
  return counts !== null && counts.totalReportCount > 1
}
