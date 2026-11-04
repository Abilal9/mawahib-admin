import { describe, expect, it } from 'vitest'
import { describeFactorStep } from './factors'
import type { AuthFactor } from './types'

function factor(overrides: Partial<AuthFactor>): AuthFactor {
  return { id: 'factor-1', factorType: 'totp', status: 'verified', ...overrides }
}

describe('describeFactorStep', () => {
  it('asks for setup when the account has no factors', () => {
    expect(describeFactorStep([])).toEqual({ kind: 'setup' })
  })

  it('challenges the one verified authenticator', () => {
    expect(describeFactorStep([factor({})])).toEqual({ kind: 'verified', factorId: 'factor-1' })
  })

  it('keeps a single unfinished factor from being replaced automatically', () => {
    expect(describeFactorStep([factor({ status: 'unverified' })])).toEqual({ kind: 'unverified', factorId: 'factor-1' })
  })

  it('stops for an unexpected factor mix', () => {
    expect(describeFactorStep([factor({ factorType: 'phone' })])).toEqual({ kind: 'operator-help' })
    expect(describeFactorStep([factor({ factorType: 'other' })])).toEqual({ kind: 'operator-help' })
    expect(describeFactorStep([factor({ id: 'a' }), factor({ id: 'b' })])).toEqual({ kind: 'operator-help' })
    expect(describeFactorStep([factor({ id: 'a' }), factor({ id: 'b', status: 'unverified' })])).toEqual({ kind: 'operator-help' })
  })
})
