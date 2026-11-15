import { describe, expect, it } from 'vitest'
import { financialFollowUpText, initiationFrom } from './staffClosureCopy'

describe('staff closure presentation', () => {
  it('keeps financial follow-up distinct from a payment change', () => {
    expect(financialFollowUpText('outstanding')).toContain('outstanding')
    expect(financialFollowUpText('outstanding')).toContain('not a provider refund')
    expect(financialFollowUpText('not_required')).toContain('not required')
    expect(financialFollowUpText('recorded')).toContain('does not change the payment')
    expect(financialFollowUpText('not_recorded')).toContain('not recorded')
  })

  it('accepts a short support reference and rejects an email-sized note', () => {
    expect(initiationFrom('support_request', 'desk-14')).toEqual({ category: 'support_request', reference: 'desk-14' })
    expect(initiationFrom('support_request', 'hello\nemail body')).toBeNull()
    expect(initiationFrom('staff_observation', '')).toEqual({ category: 'staff_observation' })
  })
})
