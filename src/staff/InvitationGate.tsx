import { useEffect, useState } from 'react'
import { readInviteCallback, stripInviteLocation, type InviteCallback } from './invitationCallback'
import { beginInvitation, readInviteStep, readInviteSubject, writeInviteStep, writeInviteSubject, type InviteView } from './invitationFlow'
import { InvitationScreen } from './InvitationScreen'
import type { InviteAcceptance } from './invitationAuth'

type InvitationGateProps = {
  invite: InviteAcceptance
  onReady: () => void
}

const initialStarts = new Map<string, Promise<InviteView>>()
let capturedCallback: InviteCallback | null = null

function captureInviteCallback(): InviteCallback {
  if (capturedCallback) return capturedCallback
  capturedCallback = readInviteCallback(window.location.search, window.location.hash)
  stripInviteLocation(window.location, (url) => window.history.replaceState(window.history.state, '', url))
  return capturedCallback
}

function releaseInviteCallback() {
  capturedCallback = { kind: 'absent' }
  initialStarts.clear()
}

export function InvitationGate({ invite, onReady }: InvitationGateProps) {
  const [view, setView] = useState<InviteView>({ name: 'loading' })

  useEffect(() => {
    const callback = captureInviteCallback()
    const key = callbackKey(callback)
    const existing = initialStarts.get(key)
    const started = existing ?? start(invite, callback, null)
    if (!existing) initialStarts.set(key, started)
    let active = true
    void started.then(async (result) => {
      if (!active) return
      if (result.name === 'password') {
        writeInviteStep(window.sessionStorage, result.purpose === 'recovery' ? 'recovery' : 'password')
        const subjectId = await invite.currentUserId()
        if (!active) return
        if (subjectId && subjectId !== 'unavailable') writeInviteSubject(window.sessionStorage, subjectId)
      }
      if (result.name === 'conflict' || result.name === 'invalid' || result.name === 'expired' || result.name === 'wrong-flow' || result.name === 'unverified-link') {
        writeInviteStep(window.sessionStorage, null)
        writeInviteSubject(window.sessionStorage, null)
      }
      if (result.name !== 'failure' && result.name !== 'conflict') releaseInviteCallback()
      setView(result)
    })
    return () => {
      active = false
    }
  }, [invite])

  async function savePassword(password: string) {
    setView((current) => (current.name === 'password' ? { ...current, error: null, busy: true } : current))
    const error = await invite.choosePassword(password)
    if (error) {
      setView((current) => (current.name === 'password' ? { ...current, error, busy: false } : current))
      return
    }
    writeInviteStep(window.sessionStorage, null)
    writeInviteSubject(window.sessionStorage, null)
    onReady()
  }

  return (
    <InvitationScreen
      state={view}
      onPassword={(password) => void savePassword(password)}
      onRetry={() => {
        void start(invite, captureInviteCallback(), null).then(async (result) => {
          if (result.name === 'password') {
            writeInviteStep(window.sessionStorage, result.purpose === 'recovery' ? 'recovery' : 'password')
            const subjectId = await invite.currentUserId()
            if (subjectId && subjectId !== 'unavailable') writeInviteSubject(window.sessionStorage, subjectId)
          }
          if (result.name !== 'failure' && result.name !== 'conflict') releaseInviteCallback()
          setView(result)
        })
      }}
      onSignOut={() => {
        void invite.signOut().then(
          () =>
            start(invite, captureInviteCallback(), 'signed-out').then(async (result) => {
              if (result.name === 'password') {
                writeInviteStep(window.sessionStorage, 'password')
                const subjectId = await invite.currentUserId()
                if (subjectId && subjectId !== 'unavailable') writeInviteSubject(window.sessionStorage, subjectId)
              }
              if (result.name !== 'failure') releaseInviteCallback()
              setView(result)
            }),
          () => setView({ name: 'conflict' }),
        )
      }}
    />
  )
}

function start(invite: InviteAcceptance, callback: InviteCallback, signedOut: string | null) {
  return invite.currentUserId().then((currentUserId) =>
    beginInvitation({
      callback,
      currentUserId: signedOut ? null : currentUserId,
      savedStep: readInviteStep(window.sessionStorage),
      savedSubjectId: readInviteSubject(window.sessionStorage),
      acceptOtp: (tokenHash) => invite.acceptOtp(tokenHash),
      acceptRecovery: (tokenHash) => invite.acceptRecovery(tokenHash),
      markAccepting: () => writeInviteStep(window.sessionStorage, callback.kind === 'recovery' ? 'recovery' : 'accepting'),
    }),
  )
}

function callbackKey(callback: InviteCallback): string {
  if (callback.kind === 'otp' || callback.kind === 'recovery') return `${callback.kind}:${callback.tokenHash}`
  return callback.kind
}
