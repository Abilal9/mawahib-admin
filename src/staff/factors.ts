import type { AuthFactor } from './types'

export type FactorStep =
  | { kind: 'setup' }
  | { kind: 'unverified'; factorId: string }
  | { kind: 'verified'; factorId: string }
  | { kind: 'operator-help' }

export function describeFactorStep(factors: AuthFactor[]): FactorStep {
  const unsupported = factors.filter((factor) => factor.factorType !== 'totp')
  if (unsupported.length > 0) return { kind: 'operator-help' }

  const verified = factors.filter((factor) => factor.status === 'verified')
  const unverified = factors.filter((factor) => factor.status === 'unverified')
  if (verified.length > 1 || unverified.length > 1) return { kind: 'operator-help' }
  if (verified.length === 1 && unverified.length > 0) return { kind: 'operator-help' }
  if (verified.length === 1) return { kind: 'verified', factorId: verified[0].id }
  if (unverified.length === 1) return { kind: 'unverified', factorId: unverified[0].id }
  return { kind: 'setup' }
}
