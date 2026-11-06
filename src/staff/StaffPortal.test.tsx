import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StaffPortal } from './StaffPortal'
import type { AuthFactor, StaffAccessResult, StaffAuthClient, StaffAuthEvent } from './types'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

type FakeOptions = {
  accessToken?: string | null
  userId?: string | null
  level?: 'aal1' | 'aal2' | null
  factors?: AuthFactor[]
}

function createHarness(options: FakeOptions = {}) {
  let accessToken = options.accessToken ?? null
  let userId = options.userId ?? null
  let level: 'aal1' | 'aal2' | null = options.level === undefined ? 'aal1' : options.level
  let factors = options.factors ?? []
  const listeners = new Set<(event: StaffAuthEvent, session: { accessToken: string | null; userId: string | null }) => void>()
  const checks: string[] = []
  const checkQueue: Array<(result: StaffAccessResult) => void> = []
  let scriptedChecks: StaffAccessResult[] | null = null
  let signInGate: Deferred<{ error: string | null }> | null = null
  let enrollGate: Deferred<{ ok: true; factorId: string; secret: string; qrCode: string | null } | { ok: false; error: string }> | null = null
  let verifyGate: Deferred<{ error: string | null }> | null = null
  let signOutGate: Deferred<void> | null = null
  let signOutShouldFail = false
  let verifyError: string | null = null
  const counts = { signIn: 0, enroll: 0, verify: 0, signOut: 0, challenge: 0 }

  const auth: StaffAuthClient = {
    async getSession() {
      return { accessToken, userId }
    },
    async signInWithPassword() {
      counts.signIn += 1
      const result = signInGate ? await signInGate.promise : { error: null }
      if (!result.error) {
        accessToken = accessToken ?? 'token-1'
        userId = userId ?? 'user-1'
        listeners.forEach((listener) => listener('signed-in', { accessToken, userId }))
      }
      return result
    },
    async signOut() {
      counts.signOut += 1
      if (signOutShouldFail) throw new Error('sign-out-failed')
      if (signOutGate) await signOutGate.promise
      accessToken = null
      userId = null
      listeners.forEach((listener) => listener('signed-out', { accessToken: null, userId: null }))
    },
    async assuranceLevel() {
      return level
    },
    async listFactors() {
      return factors
    },
    async enrollTotp() {
      counts.enroll += 1
      if (enrollGate) return enrollGate.promise
      factors = [...factors, { id: 'factor-new', factorType: 'totp', status: 'unverified' }]
      return { ok: true, factorId: 'factor-new', secret: 'ENROLL-SECRET', qrCode: null }
    },
    async challenge() {
      counts.challenge += 1
      return { ok: true, challengeId: `challenge-${counts.challenge}` }
    },
    async verify() {
      counts.verify += 1
      const result = verifyGate ? await verifyGate.promise : { error: verifyError }
      if (!result.error) {
        factors = factors.map((factor) => (factor.factorType === 'totp' ? { ...factor, status: 'verified' as const } : factor))
        level = 'aal2'
        listeners.forEach((listener) => listener('mfa-verified', { accessToken, userId }))
      }
      return result
    },
    onAuthStateChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    auth,
    counts,
    checks,
    holdSignIn() {
      signInGate = deferred()
      return signInGate
    },
    holdEnroll() {
      enrollGate = deferred()
      return enrollGate
    },
    holdVerify() {
      verifyGate = deferred()
      return verifyGate
    },
    holdSignOut() {
      signOutGate = deferred()
      return signOutGate
    },
    failSignOut() {
      signOutShouldFail = true
    },
    failVerification() {
      verifyError = 'invalid'
    },
    setAccessResults(results: StaffAccessResult[]) {
      scriptedChecks = [...results]
    },
    replaceSession(next: { accessToken: string | null; userId: string | null; level: 'aal1' | 'aal2' | null; factors: AuthFactor[] }) {
      accessToken = next.accessToken
      userId = next.userId
      level = next.level
      factors = next.factors
    },
    emit(event: StaffAuthEvent) {
      listeners.forEach((listener) => listener(event, { accessToken, userId }))
    },
    access: {
      async check(token: string) {
        checks.push(token)
        const scripted = scriptedChecks?.shift()
        if (scripted) return scripted
        return new Promise<StaffAccessResult>((resolve) => checkQueue.push(resolve))
      },
    },
    releaseCheck(result: StaffAccessResult) {
      checkQueue.shift()?.(result)
    },
  }
}

async function signIn(harness: ReturnType<typeof createHarness>, email = 'staff@example.com') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  return harness
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('StaffPortal', () => {
  it('shows sign-in when no session is stored', async () => {
    const harness = createHarness()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeTruthy()
    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
    expect(harness.checks).toEqual([])
  })

  it('shows a generic error when sign-in fails', async () => {
    const harness = createHarness()
    const pending = harness.holdSignIn()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('heading', { name: 'Staff sign in' })
    await signIn(harness)
    pending.resolve({ error: 'invalid login' })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Email or password is incorrect.')
    expect(harness.checks).toEqual([])
  })

  it('ignores a second sign-in click while the first is in flight', async () => {
    const harness = createHarness()
    harness.holdSignIn()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } })
    const button = screen.getByRole('button', { name: 'Sign in' })
    button.click()
    button.click()
    expect(harness.counts.signIn).toBe(1)
  })

  it('does not apply a stale sign-in failure after a newer session is accepted', async () => {
    const harness = createHarness()
    const pending = harness.holdSignIn()
    harness.setAccessResults([{ ok: true, role: 'operator' }])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    harness.replaceSession({
      accessToken: 'token-b',
      userId: 'user-b',
      level: 'aal2',
      factors: [{ id: 'totp-b', factorType: 'totp', status: 'verified' }],
    })
    harness.emit('signed-in')
    expect(await screen.findByRole('heading', { name: 'Staff session' })).toBeTruthy()
    await act(async () => {
      pending.resolve({ error: 'old failure' })
    })
    expect(screen.getByRole('heading', { name: 'Staff session' })).toBeTruthy()
    expect(screen.queryByText('Email or password is incorrect.')).toBeNull()
  })

  it('moves from password sign-in to authenticator setup without calling staff access', async () => {
    const harness = createHarness()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    expect(await screen.findByRole('heading', { name: 'Authenticator setup required' })).toBeTruthy()
    expect(screen.getByText(/does not activate staff access/)).toBeTruthy()
    expect(harness.checks).toEqual([])
  })

  it('enrolls once, keeps the secret only on that screen, and rejects a bad code', async () => {
    const harness = createHarness()
    harness.failVerification()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    await screen.findByRole('button', { name: 'Set up authenticator' })
    const setup = screen.getByRole('button', { name: 'Set up authenticator' })
    setup.click()
    setup.click()
    expect(await screen.findByLabelText('Setup secret')).toHaveProperty('value', 'ENROLL-SECRET')
    expect(harness.counts.enroll).toBe(1)
    expect(window.location.href).not.toContain('ENROLL-SECRET')
    expect(sessionStorage.getItem('sb-project-auth-token')).toBeNull()
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'That code is not valid or has expired.')
    expect(screen.getByLabelText('Setup secret')).toHaveProperty('value', 'ENROLL-SECRET')
    expect(harness.checks).toEqual([])
  })

  it('drops a setup secret when sign-out wins over a late enrollment response', async () => {
    const harness = createHarness()
    const pending = harness.holdEnroll()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    await screen.findByRole('button', { name: 'Set up authenticator' })
    fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await act(async () => {
      pending.resolve({ ok: true, factorId: 'late-factor', secret: 'LATE-SECRET', qrCode: null })
    })
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeTruthy()
    expect(screen.queryByDisplayValue('LATE-SECRET')).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('asks an administrator for help when setup is canceled', async () => {
    const harness = createHarness()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    expect(await screen.findByLabelText('Setup secret')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel setup' }))
    expect(await screen.findByRole('heading', { name: 'Administrator help required' })).toBeTruthy()
    expect(screen.queryByDisplayValue('ENROLL-SECRET')).toBeNull()
  })

  it('challenges an existing authenticator and keeps an expired code on that screen', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal1',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.failVerification()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Authenticator code' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'That code is not valid or has expired.')
    expect(screen.getByRole('heading', { name: 'Authenticator code' })).toBeTruthy()
    expect(harness.checks).toEqual([])
  })

  it('does not grant staff access from a successful authenticator check alone', async () => {
    const harness = createHarness()
    harness.setAccessResults([{ ok: false, kind: 'denied' }])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Staff access is not active for this account. Contact your administrator.',
    )
    expect(screen.queryByRole('heading', { name: 'Staff session' })).toBeNull()
    expect(harness.checks).toEqual(['token-1'])
  })

  it('shows the operator role only after the backend accepts the session', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.setAccessResults([{ ok: true, role: 'operator' }])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Staff session' })).toBeTruthy()
    expect(screen.getByText('Role: Operator')).toBeTruthy()
    expect(harness.checks).toEqual(['token-1'])
  })

  it('keeps a backend outage distinct from denied staff access', async () => {
    const denied = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    denied.setAccessResults([{ ok: false, kind: 'denied' }])
    const unavailable = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    unavailable.setAccessResults([{ ok: false, kind: 'unavailable' }])

    const first = render(<StaffPortal auth={denied.auth} access={denied.access} />)
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    first.unmount()

    render(<StaffPortal auth={unavailable.auth} access={unavailable.access} />)
    expect(await screen.findByText('The staff service is temporarily unavailable. Try again.')).toBeTruthy()
    expect(unavailable.counts.signOut).toBe(0)
    expect(screen.queryByText('Staff access is not active for this account. Contact your administrator.')).toBeNull()
  })

  it('signs out an expired backend session', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.setAccessResults([{ ok: false, kind: 'expired' }])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByText('Your session has expired. Sign in again.')).toBeTruthy()
    expect(harness.counts.signOut).toBe(1)
  })

  it('checks staff access again with the refreshed token', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.setAccessResults([
      { ok: true, role: 'operator' },
      { ok: false, kind: 'denied' },
    ])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Staff session' })).toBeTruthy()
    harness.replaceSession({
      accessToken: 'token-2',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.emit('token-refreshed')
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(harness.checks).toEqual(['token-1', 'token-2'])
  })

  it('retries a staff-service outage with a new access check', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.setAccessResults([
      { ok: false, kind: 'unavailable' },
      { ok: true, role: 'operator' },
    ])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Staff session' })).toBeTruthy()
    expect(harness.checks).toEqual(['token-1', 'token-1'])
  })

  it('ignores a late staff-access approval after the account has changed', async () => {
    const harness = createHarness({
      accessToken: 'token-a',
      userId: 'user-a',
      level: 'aal2',
      factors: [{ id: 'totp-a', factorType: 'totp', status: 'verified' }],
    })
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Checking staff access' })).toBeTruthy()
    expect(harness.checks).toEqual(['token-a'])
    harness.replaceSession({
      accessToken: 'token-b',
      userId: 'user-b',
      level: 'aal2',
      factors: [{ id: 'totp-b', factorType: 'totp', status: 'verified' }],
    })
    harness.emit('signed-in')
    await act(async () => {
      harness.releaseCheck({ ok: true, role: 'operator' })
    })
    expect(screen.queryByRole('heading', { name: 'Staff session' })).toBeNull()
    await waitFor(() => expect(harness.checks).toEqual(['token-a', 'token-b']))
    harness.releaseCheck({ ok: false, kind: 'denied' })
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(harness.checks).toEqual(['token-a', 'token-b'])
  })

  it('keeps the setup secret when the same session emits sign-in again', async () => {
    const harness = createHarness()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    expect(await screen.findByDisplayValue('ENROLL-SECRET')).toBeTruthy()
    harness.emit('signed-in')
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByDisplayValue('ENROLL-SECRET')).toBeTruthy()
  })

  it('does not show an unfinished authenticator secret for a replacement account', async () => {
    const harness = createHarness()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    expect(await screen.findByDisplayValue('ENROLL-SECRET')).toBeTruthy()
    harness.replaceSession({ accessToken: 'token-b', userId: 'user-b', level: 'aal1', factors: [] })
    harness.emit('signed-in')
    expect(await screen.findByRole('heading', { name: 'Authenticator setup required' })).toBeTruthy()
    expect(screen.queryByDisplayValue('ENROLL-SECRET')).toBeNull()
  })

  it('ignores a late authenticator error after the account changes', async () => {
    const harness = createHarness({
      accessToken: 'token-a',
      userId: 'user-a',
      level: 'aal1',
      factors: [{ id: 'totp-a', factorType: 'totp', status: 'verified' }],
    })
    const pending = harness.holdVerify()
    harness.setAccessResults([{ ok: false, kind: 'denied' }])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Authenticator code' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))
    harness.replaceSession({
      accessToken: 'token-b',
      userId: 'user-b',
      level: 'aal2',
      factors: [{ id: 'totp-b', factorType: 'totp', status: 'verified' }],
    })
    harness.emit('signed-in')
    expect(await screen.findByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    await act(async () => {
      pending.resolve({ error: 'invalid' })
    })
    expect(screen.getByText('Staff access is not active for this account. Contact your administrator.')).toBeTruthy()
    expect(screen.queryByText('That code is not valid or has expired.')).toBeNull()
  })

  it('keeps enrollment going when the same session refreshes', async () => {
    const harness = createHarness()
    const pending = harness.holdEnroll()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    harness.emit('token-refreshed')
    await act(async () => {
      pending.resolve({ ok: true, factorId: 'factor-new', secret: 'ENROLL-SECRET', qrCode: null })
    })
    expect(await screen.findByDisplayValue('ENROLL-SECRET')).toBeTruthy()
  })

  it('removes the setup secret before sign-out finishes', async () => {
    const harness = createHarness()
    const pending = harness.holdSignOut()
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    await screen.findByRole('button', { name: 'Sign in' })
    await signIn(harness)
    fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    expect(await screen.findByDisplayValue('ENROLL-SECRET')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.queryByDisplayValue('ENROLL-SECRET')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Staff sign in' })).toBeTruthy()
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByDisplayValue('ENROLL-SECRET')).toBeNull()
  })

  it('does not claim sign-out succeeded while the session remains', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    harness.failSignOut()
    harness.setAccessResults([
      { ok: true, role: 'operator' },
      { ok: true, role: 'operator' },
    ])
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Staff session' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText('Sign-out did not complete. This session is still active.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Staff session' })).toBeTruthy()
    expect(harness.checks).toEqual(['token-1', 'token-1'])
  })

  it('asks to retry when the assurance level cannot be read', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: null,
      factors: [{ id: 'totp-1', factorType: 'totp', status: 'verified' }],
    })
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByText('The authenticator service is temporarily unavailable. Try again.')).toBeTruthy()
    expect(harness.checks).toEqual([])
  })

  it('stops for an unexpected authenticator configuration', async () => {
    const harness = createHarness({
      accessToken: 'token-1',
      userId: 'user-1',
      level: 'aal2',
      factors: [{ id: 'phone-1', factorType: 'phone', status: 'verified' }],
    })
    render(<StaffPortal auth={harness.auth} access={harness.access} />)
    expect(await screen.findByRole('heading', { name: 'Administrator help required' })).toBeTruthy()
    expect(harness.checks).toEqual([])
  })
})
