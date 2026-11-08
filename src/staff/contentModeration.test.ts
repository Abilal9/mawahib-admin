import { describe, expect, it } from 'vitest'
import { moderationNotice, shouldRefreshModeration } from './contentModeration'

describe('content moderation follow-up', () => {
  it('does not claim an uncertain request changed the content', () => {
    const result = { ok: false as const, kind: 'uncertain' as const }
    expect(moderationNotice(result)).toMatch(/not confirmed/)
    expect(moderationNotice(result)).toMatch(/not assumed/)
    expect(shouldRefreshModeration(result)).toBe(true)
  })

  it('asks for a fresh confirmation after a conflict', () => {
    const result = { ok: false as const, kind: 'conflict' as const }
    expect(moderationNotice(result)).toMatch(/Confirm it again/)
    expect(shouldRefreshModeration(result)).toBe(true)
  })

  it('treats an unchanged result as already in effect', () => {
    const result = { ok: true as const, data: { outcome: 'unchanged' as const, hidden: true, hiddenAt: null, version: 2 } }
    expect(moderationNotice(result)).toMatch(/did not change/)
  })

  it('clears the notice only after a confirmed change', () => {
    const result = { ok: true as const, data: { outcome: 'changed' as const, hidden: true, hiddenAt: null, version: 1 } }
    expect(moderationNotice(result)).toBeNull()
    expect(shouldRefreshModeration(result)).toBe(true)
  })
})
