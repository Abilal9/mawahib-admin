import { useEffect, useRef, useState } from 'react'
import { describeFactorStep } from './factors'
import type { PortalState, StaffAccessClient, StaffAuthClient, StaffAuthEvent, StaffSessionSnapshot } from './types'

type EnrollmentDraft = {
  userId: string
  factorId: string
  secret: string
  qrCode: string | null
}

const signInError = 'Email or password is incorrect.'
const codeError = 'That code is not valid or has expired.'
const sessionExpired = 'Your session has expired. Sign in again.'
const signOutIncomplete = 'Sign-out did not complete. This session is still active.'

export function useStaffSession(auth: StaffAuthClient, access: StaffAccessClient) {
  const [state, setState] = useState<PortalState>({ name: 'initializing' })
  const [notice, setNotice] = useState<string | null>(null)
  const epochRef = useRef(0)
  const busyRef = useRef(false)
  const phaseRef = useRef<PortalState['name']>('initializing')
  const draftRef = useRef<EnrollmentDraft | null>(null)
  const userIdRef = useRef<string | null>(null)
  const expiryRef = useRef(false)
  const authRef = useRef(auth)
  const accessRef = useRef(access)
  authRef.current = auth
  accessRef.current = access

  function commit(next: PortalState) {
    phaseRef.current = next.name
    setState(next)
  }

  function clearDraft() {
    draftRef.current = null
  }

  function isCurrent(epoch: number) {
    return epochRef.current === epoch
  }

  async function checkStaff(epoch: number, session: StaffSessionSnapshot) {
    if (!session.accessToken || !session.userId) {
      clearDraft()
      commit({ name: 'signed-out', error: sessionExpired, busy: false })
      return
    }
    commit({ name: 'checking' })
    const result = await accessRef.current.check(session.accessToken)
    if (!isCurrent(epoch)) return
    const latest = await authRef.current.getSession()
    if (!isCurrent(epoch) || latest.userId !== session.userId || latest.accessToken !== session.accessToken) return

    if (result.ok) {
      clearDraft()
      commit({ name: 'accepted', role: result.role })
      return
    }
    if (result.kind === 'denied') {
      clearDraft()
      commit({ name: 'denied' })
      return
    }
    if (result.kind === 'pending') {
      clearDraft()
      commit({ name: 'pending' })
      return
    }
    if (result.kind === 'expired') {
      expiryRef.current = true
      await authRef.current.signOut()
      if (!isCurrent(epoch)) return
      clearDraft()
      commit({ name: 'signed-out', error: sessionExpired, busy: false })
      return
    }
    commit({ name: 'unavailable' })
  }

  async function startChallenge(epoch: number, factorId: string) {
    commit({ name: 'challenge', factorId, challengeId: null, error: null, busy: true })
    const challenge = await authRef.current.challenge(factorId)
    if (!isCurrent(epoch)) return
    if (!challenge.ok) {
      commit({ name: 'challenge', factorId, challengeId: null, error: 'The authenticator service is temporarily unavailable. Try again.', busy: false })
      return
    }
    commit({ name: 'challenge', factorId, challengeId: challenge.challengeId, error: null, busy: false })
  }

  async function resolve(epoch: number) {
    const session = await authRef.current.getSession()
    if (!isCurrent(epoch)) return
    if (!session.accessToken || !session.userId) {
      userIdRef.current = null
      clearDraft()
      commit({ name: 'signed-out', error: null, busy: false })
      return
    }
    userIdRef.current = session.userId
    if (draftRef.current && draftRef.current.userId !== session.userId) clearDraft()

    let level: 'aal1' | 'aal2' | null
    let factors
    try {
      ;[level, factors] = await Promise.all([authRef.current.assuranceLevel(), authRef.current.listFactors()])
    } catch {
      if (!isCurrent(epoch)) return
      commit({ name: 'auth-unavailable' })
      return
    }
    if (!isCurrent(epoch)) return

    const step = describeFactorStep(factors)
    if (step.kind === 'setup') {
      clearDraft()
      commit({ name: 'setup-required', error: null, busy: false })
      return
    }
    if (step.kind === 'unverified') {
      const draft = draftRef.current
      if (draft && draft.userId === session.userId && draft.factorId === step.factorId) {
        commit({ name: 'enrolling', factorId: draft.factorId, secret: draft.secret, qrCode: draft.qrCode, error: null, busy: false })
        return
      }
      clearDraft()
      commit({ name: 'enrollment-interrupted', factorId: step.factorId, error: null, busy: false })
      return
    }
    if (step.kind === 'verified') {
      clearDraft()
      if (level === 'aal2') {
        await checkStaff(epoch, session)
        return
      }
      if (level === 'aal1') {
        await startChallenge(epoch, step.factorId)
        return
      }
      commit({ name: 'auth-unavailable' })
      return
    }
    clearDraft()
    commit({ name: 'operator-help' })
  }

  async function recheck(epoch: number) {
    const session = await authRef.current.getSession()
    if (!isCurrent(epoch)) return
    if (!session.accessToken || !session.userId) {
      clearDraft()
      commit({ name: 'signed-out', error: sessionExpired, busy: false })
      return
    }
    await checkStaff(epoch, session)
  }

  useEffect(() => {
    const epoch = epochRef.current
    void resolve(epoch)
    const stop = auth.onAuthStateChange((event: StaffAuthEvent, session) => {
      if (event === 'initial') return
      if (event === 'token-refreshed' || (session.userId && session.userId === userIdRef.current && (event === 'signed-in' || event === 'user-updated'))) {
        const phase = phaseRef.current
        if (phase === 'accepted' || phase === 'checking' || phase === 'denied' || phase === 'unavailable') {
          const nextEpoch = ++epochRef.current
          busyRef.current = false
          void recheck(nextEpoch)
        }
        return
      }
      const nextEpoch = ++epochRef.current
      busyRef.current = false
      if (event === 'signed-out') {
        const expired = expiryRef.current
        expiryRef.current = false
        userIdRef.current = null
        clearDraft()
        commit({ name: 'signed-out', error: expired ? sessionExpired : null, busy: false })
        return
      }
      if (event === 'password-recovery') {
        clearDraft()
        commit({ name: 'signed-out', error: null, busy: false })
        void auth.signOut()
        return
      }
      clearDraft()
      commit({ name: 'initializing' })
      void resolve(nextEpoch)
    })
    return () => {
      epochRef.current += 1
      stop()
    }
  }, [auth])

  async function signIn(email: string, password: string) {
    if (busyRef.current) return
    busyRef.current = true
    const epoch = ++epochRef.current
    setNotice(null)
    commit({ name: 'signed-out', error: null, busy: true })
    try {
      const result = await authRef.current.signInWithPassword(email, password)
      if (!isCurrent(epoch)) return
      busyRef.current = false
      if (result.error) {
        commit({ name: 'signed-out', error: signInError, busy: false })
        return
      }
      await resolve(epoch)
    } catch {
      if (!isCurrent(epoch)) return
      busyRef.current = false
      commit({ name: 'signed-out', error: signInError, busy: false })
    }
  }

  async function beginEnrollment() {
    if (busyRef.current) return
    busyRef.current = true
    const epoch = ++epochRef.current
    commit({ name: 'setup-required', error: null, busy: true })
    try {
      const session = await authRef.current.getSession()
      if (!isCurrent(epoch) || !session.userId) {
        busyRef.current = false
        return
      }
      const factors = await authRef.current.listFactors()
      if (!isCurrent(epoch)) {
        busyRef.current = false
        return
      }
      const step = describeFactorStep(factors)
      if (step.kind !== 'setup') {
        busyRef.current = false
        clearDraft()
        if (step.kind === 'unverified') {
          commit({ name: 'enrollment-interrupted', factorId: step.factorId, error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
          return
        }
        commit({ name: 'operator-help' })
        return
      }
      const enrolled = await authRef.current.enrollTotp()
      if (!isCurrent(epoch)) {
        busyRef.current = false
        return
      }
      busyRef.current = false
      if (!enrolled.ok) {
        commit({ name: 'setup-required', error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
        return
      }
      draftRef.current = { userId: session.userId, factorId: enrolled.factorId, secret: enrolled.secret, qrCode: enrolled.qrCode }
      commit({
        name: 'enrolling',
        factorId: enrolled.factorId,
        secret: enrolled.secret,
        qrCode: enrolled.qrCode,
        error: null,
        busy: false,
      })
    } catch {
      if (!isCurrent(epoch)) return
      busyRef.current = false
      commit({ name: 'setup-required', error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
    }
  }

  async function verifyCode(code: string) {
    if (busyRef.current) return
    const current = state
    if (current.name !== 'enrolling' && current.name !== 'challenge') return
    if (current.name === 'challenge' && !current.challengeId) return
    busyRef.current = true
    const epoch = ++epochRef.current
    commit({ ...current, error: null, busy: true })
    const factorId = current.factorId
    let challengeId = current.name === 'challenge' ? current.challengeId : null
    if (!challengeId) {
      const challenge = await authRef.current.challenge(factorId)
      if (!isCurrent(epoch)) return
      if (!challenge.ok) {
        busyRef.current = false
        commit({ ...current, error: 'The authenticator service is temporarily unavailable. Try again.', busy: false })
        return
      }
      challengeId = challenge.challengeId
    }
    const verified = await authRef.current.verify({ factorId, challengeId, code })
    if (!isCurrent(epoch)) return
    busyRef.current = false
    if (verified.error) {
      if (current.name === 'enrolling') {
        const draft = draftRef.current
        if (!draft?.secret) {
          clearDraft()
          commit({ name: 'operator-help' })
          return
        }
        commit({
          name: 'enrolling',
          factorId,
          secret: draft.secret,
          qrCode: draft.qrCode,
          error: codeError,
          busy: false,
        })
        return
      }
      const replacement = await authRef.current.challenge(factorId)
      if (!isCurrent(epoch)) return
      commit({
        name: 'challenge',
        factorId,
        challengeId: replacement.ok ? replacement.challengeId : null,
        error: replacement.ok ? codeError : 'The authenticator service is temporarily unavailable. Try again.',
        busy: false,
      })
      return
    }
    clearDraft()
    await resolve(epoch)
  }

  async function restartEnrollment() {
    if (busyRef.current || state.name !== 'enrollment-interrupted') return
    busyRef.current = true
    const epoch = ++epochRef.current
    const factorId = state.factorId
    commit({ name: 'enrollment-interrupted', factorId, error: null, busy: true })
    try {
      const removed = await authRef.current.unenrollUnverified(factorId)
      if (!isCurrent(epoch)) return
      busyRef.current = false
      if (!removed.ok) {
        commit({ name: 'enrollment-interrupted', factorId, error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
        return
      }
      await beginEnrollment()
    } catch {
      if (!isCurrent(epoch)) return
      busyRef.current = false
      commit({ name: 'enrollment-interrupted', factorId, error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
    }
  }

  async function cancelEnrollment() {
    if (busyRef.current || state.name !== 'enrolling') return
    busyRef.current = true
    const epoch = ++epochRef.current
    const current = state
    commit({ ...current, error: null, busy: true })
    try {
      const removed = await authRef.current.unenrollUnverified(current.factorId)
      if (!isCurrent(epoch)) return
      busyRef.current = false
      if (!removed.ok) {
        commit({ ...current, error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
        return
      }
      clearDraft()
      commit({ name: 'setup-required', error: null, busy: false })
    } catch {
      if (!isCurrent(epoch)) return
      busyRef.current = false
      commit({ ...current, error: 'Authenticator setup is temporarily unavailable. Try again.', busy: false })
    }
  }

  async function signOut() {
    const epoch = ++epochRef.current
    busyRef.current = false
    clearDraft()
    expiryRef.current = false
    setNotice(null)
    commit({ name: 'signed-out', error: null, busy: true })
    try {
      await authRef.current.signOut()
    } catch {
      // The session read below decides whether credentials are actually gone.
    }
    if (!isCurrent(epoch)) return
    const session = await authRef.current.getSession()
    if (!isCurrent(epoch)) return
    if (session.accessToken && session.userId) {
      setNotice(signOutIncomplete)
      userIdRef.current = session.userId
      await resolve(epoch)
      return
    }
    userIdRef.current = null
    setNotice(null)
    commit({ name: 'signed-out', error: null, busy: false })
  }

  async function retryStaffCheck() {
    if (busyRef.current) return
    const epoch = ++epochRef.current
    await recheck(epoch)
  }

  async function retryAuthentication() {
    if (busyRef.current) return
    const epoch = ++epochRef.current
    await resolve(epoch)
  }

  async function retryChallenge() {
    if (state.name !== 'challenge' || busyRef.current) return
    const epoch = epochRef.current
    await startChallenge(epoch, state.factorId)
  }

  return {
    state,
    signIn,
    beginEnrollment,
    restartEnrollment,
    verifyCode,
    cancelEnrollment,
    signOut,
    retryStaffCheck,
    retryAuthentication,
    retryChallenge,
    notice,
  }
}
