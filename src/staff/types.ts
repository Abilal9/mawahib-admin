export type AuthFactor = {
  id: string
  factorType: 'totp' | 'phone' | 'other'
  status: 'verified' | 'unverified'
}

export type StaffSessionSnapshot = {
  accessToken: string | null
  userId: string | null
}

export type StaffAuthEvent =
  | 'initial'
  | 'signed-in'
  | 'signed-out'
  | 'token-refreshed'
  | 'user-updated'
  | 'password-recovery'
  | 'mfa-verified'

export type StaffAuthClient = {
  getSession(): Promise<StaffSessionSnapshot>
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
  assuranceLevel(): Promise<'aal1' | 'aal2' | null>
  listFactors(): Promise<AuthFactor[]>
  enrollTotp(): Promise<{ ok: true; factorId: string; secret: string; qrCode: string | null } | { ok: false; error: string }>
  challenge(factorId: string): Promise<{ ok: true; challengeId: string } | { ok: false; error: string }>
  verify(input: { factorId: string; challengeId: string; code: string }): Promise<{ error: string | null }>
  onAuthStateChange(listener: (event: StaffAuthEvent, session: StaffSessionSnapshot) => void): () => void
}

export type StaffAccessResult =
  | { ok: true; role: 'operator' }
  | { ok: false; kind: 'denied' | 'unavailable' | 'expired' }

export type StaffAccessClient = {
  check(accessToken: string): Promise<StaffAccessResult>
}

export type PortalState =
  | { name: 'initializing' }
  | { name: 'signed-out'; error: string | null; busy: boolean }
  | { name: 'setup-required'; error: string | null; busy: boolean }
  | { name: 'enrolling'; factorId: string; secret: string; qrCode: string | null; error: string | null; busy: boolean }
  | { name: 'challenge'; factorId: string; challengeId: string | null; error: string | null; busy: boolean }
  | { name: 'checking' }
  | { name: 'accepted'; role: 'operator' }
  | { name: 'denied' }
  | { name: 'unavailable' }
  | { name: 'auth-unavailable' }
  | { name: 'operator-help' }
