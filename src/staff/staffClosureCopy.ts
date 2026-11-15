export type StaffClosureInitiation =
  | { category: 'report'; reportId: string }
  | { category: 'support_request'; reference: string }
  | { category: 'staff_observation' }

export function initiationFrom(category: StaffClosureInitiation['category'], reference: string): StaffClosureInitiation | null {
  const value = reference.trim()
  if (category === 'staff_observation') return { category }
  if (category === 'report') {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? { category, reportId: value }
      : null
  }
  if (!value || value.length > 120 || /[\r\n]/.test(value)) return null
  return { category: 'support_request', reference: value }
}

export function financialFollowUpText(state: 'not_recorded' | 'not_required' | 'outstanding' | 'recorded' | undefined): string {
  if (state === 'outstanding') return 'Financial follow-up is outstanding. This is not a provider refund.'
  if (state === 'not_required') return 'Financial follow-up was recorded as not required.'
  if (state === 'recorded') return 'Financial follow-up is recorded. This does not change the payment.'
  if (state === 'not_recorded') return 'Financial follow-up was not recorded for this closure.'
  return ''
}
