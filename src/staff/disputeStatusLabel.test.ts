import { describe, expect, it } from 'vitest'
import { engagementHistoryText, engagementWorkStatus } from './DisputesView'

describe('staff closure presentation', () => {
  it('keeps Closed by Mawahib after the case handling status changes', () => {
    expect(engagementWorkStatus('cancelled', true)).toBe('Closed by Mawahib')
    expect(engagementWorkStatus('cancelled', false)).toBe('Cancelled')
  })

  it('does not repeat the closure label in the history note', () => {
    expect(engagementHistoryText({
      fromStatus: 'disputed',
      toStatus: 'cancelled',
      note: 'Closed by Mawahib',
    })).toBe('disputed → Closed by Mawahib')
  })
})
