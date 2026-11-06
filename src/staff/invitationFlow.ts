import type { InviteCallback } from './invitationCallback'

export type InviteView =
  | { name: 'loading' }
  | { name: 'invalid' }
  | { name: 'expired' }
  | { name: 'wrong-flow' }
  | { name: 'conflict' }
  | { name: 'failure' }
  | { name: 'unverified-link' }
  | { name: 'interrupted' }
  | { name: 'password'; purpose: 'invite' | 'recovery'; error: string | null; busy: boolean }
  | { name: 'waiting' }

const stepKey = 'mawahib.staff.invite.step'
const subjectKey = 'mawahib.staff.invite.subject'

export function readInviteStep(storage: Pick<Storage, 'getItem'>): 'accepting' | 'password' | 'recovery' | null {
  const value = storage.getItem(stepKey)
  if (value === 'accepting' || value === 'password' || value === 'recovery') return value
  return null
}

export function writeInviteStep(storage: Pick<Storage, 'setItem' | 'removeItem'>, step: 'accepting' | 'password' | 'recovery' | null) {
  if (!step) storage.removeItem(stepKey)
  else storage.setItem(stepKey, step)
}

export function readInviteSubject(storage: Pick<Storage, 'getItem'>): string | null {
  const value = storage.getItem(subjectKey)
  if (value && /^[0-9a-f-]{36}$/i.test(value)) return value
  return null
}

export function writeInviteSubject(storage: Pick<Storage, 'setItem' | 'removeItem'>, subjectId: string | null) {
  if (!subjectId) storage.removeItem(subjectKey)
  else storage.setItem(subjectKey, subjectId)
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.'
  return null
}

export async function beginInvitation(input: {
  callback: InviteCallback
  currentUserId: string | null | 'unavailable'
  savedStep: 'accepting' | 'password' | 'recovery' | null
  savedSubjectId: string | null
  acceptOtp: (tokenHash: string) => Promise<'ok' | 'invalid' | 'expired' | 'unavailable'>
  acceptRecovery: (tokenHash: string) => Promise<'ok' | 'invalid' | 'expired' | 'unavailable'>
  markAccepting?: () => void
}): Promise<InviteView> {
  if (input.callback.kind === 'absent') {
    if (input.currentUserId === 'unavailable') return { name: 'failure' }
    const accepting = input.savedStep === 'password' || input.savedStep === 'accepting' || input.savedStep === 'recovery'
    if (accepting && input.currentUserId && input.savedSubjectId !== input.currentUserId) return { name: 'conflict' }
    if (accepting && input.currentUserId && input.savedSubjectId === input.currentUserId) {
      return { name: 'password', purpose: input.savedStep === 'recovery' ? 'recovery' : 'invite', error: null, busy: false }
    }
    if (accepting && !input.currentUserId) return { name: 'interrupted' }
    return { name: 'invalid' }
  }
  if (input.currentUserId === 'unavailable') return { name: 'failure' }
  if (input.callback.kind === 'wrong-flow') return { name: 'wrong-flow' }
  if (input.callback.kind === 'unverified-session') return { name: 'unverified-link' }
  if (input.callback.kind === 'incomplete') return { name: 'invalid' }
  if (input.currentUserId) return { name: 'conflict' }
  input.markAccepting?.()
  const accepted = input.callback.kind === 'recovery'
    ? await input.acceptRecovery(input.callback.tokenHash)
    : await input.acceptOtp(input.callback.tokenHash)
  if (accepted === 'expired') return { name: 'expired' }
  if (accepted === 'invalid') return { name: 'invalid' }
  if (accepted === 'unavailable') return { name: 'failure' }
  return { name: 'password', purpose: input.callback.kind === 'recovery' ? 'recovery' : 'invite', error: null, busy: false }
}
