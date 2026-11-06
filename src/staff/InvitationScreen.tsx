import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { PasswordField } from './PasswordField'
import { SignOutButton } from './SignOutButton'

export type InvitationScreenState =
  | { name: 'loading' }
  | { name: 'invalid' }
  | { name: 'expired' }
  | { name: 'wrong-flow' }
  | { name: 'conflict' }
  | { name: 'failure' }
  | { name: 'unverified-link' }
  | { name: 'interrupted' }
  | { name: 'password'; purpose: 'invite' | 'recovery'; error: string | null; busy: boolean }
  | { name: 'enroll'; error: string | null; busy: boolean }
  | { name: 'waiting' }

type InvitationScreenProps = {
  state: InvitationScreenState
  onPassword?: (password: string) => void
  onRetry?: () => void
  onEnroll?: () => void
  onSignOut?: () => void
}

export function InvitationScreen({ state, onPassword, onRetry, onEnroll, onSignOut }: InvitationScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [state.name])

  return (
    <main className="shell">
      <section className="card" aria-labelledby="invite-title">
        <p className="brand">Mawahib</p>
        {state.name === 'loading' ? <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Invitation received</h1> : null}
        {state.name === 'invalid' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Invitation unavailable</h1>
            <p role="alert">This invitation is invalid or has already been used.</p>
          </>
        ) : null}
        {state.name === 'expired' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Invitation expired</h1>
            <p role="alert">Ask an administrator to send a new invitation.</p>
          </>
        ) : null}
        {state.name === 'wrong-flow' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Wrong sign-in link</h1>
            <p role="alert">This link is not a staff invitation.</p>
          </>
        ) : null}
        {state.name === 'conflict' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Another staff session is open</h1>
            <p role="alert">Sign out of the current staff account before accepting this invitation.</p>
            <div className="actions">
              {onSignOut ? <SignOutButton onSignOut={onSignOut} /> : null}
            </div>
          </>
        ) : null}
        {state.name === 'unverified-link' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Invitation link needs a server check</h1>
            <p role="alert">This link carries a browser session. It is not a server-verified invitation, so nothing was signed in.</p>
          </>
        ) : null}
        {state.name === 'interrupted' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Password setup was interrupted</h1>
            <p role="alert">The invitation was already accepted, and this browser no longer has that session. Ask an administrator to send a new invitation.</p>
          </>
        ) : null}
        {state.name === 'failure' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Invitation service unavailable</h1>
            <p role="alert">The invitation could not be checked. Nothing was changed.</p>
            <div className="actions">
              <button type="button" onClick={onRetry}>Try again</button>
            </div>
          </>
        ) : null}
        {state.name === 'password' ? (
          <PasswordForm
            headingRef={headingRef}
            purpose={state.purpose}
            error={state.error}
            busy={state.busy}
            onPassword={onPassword}
          />
        ) : null}
        {state.name === 'enroll' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Add an authenticator</h1>
            <p>Password saved. Add an authenticator app before an administrator can activate this account.</p>
            {state.error ? <p role="alert">{state.error}</p> : null}
            <div className="actions">
              <button type="button" disabled={state.busy} onClick={onEnroll}>Continue</button>
            </div>
          </>
        ) : null}
        {state.name === 'waiting' ? (
          <>
            <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Waiting for activation</h1>
            <p>Your password and authenticator are saved. This account stays closed until an administrator activates it.</p>
            <div className="actions">
              {onSignOut ? <SignOutButton onSignOut={onSignOut} /> : null}
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}

function PasswordForm({
  headingRef,
  purpose,
  error,
  busy,
  onPassword,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  purpose: 'invite' | 'recovery'
  error: string | null
  busy: boolean
  onPassword?: (password: string) => void
}) {
  const confirmMessageId = useId()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const mismatchVisible = mismatch && password !== confirm

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    onPassword?.(password)
  }

  return (
    <>
      <h1 id="invite-title" ref={headingRef} tabIndex={-1}>Choose a password</h1>
      <p>
        {purpose === 'recovery'
          ? 'This finishes password setup for the existing staff account. It does not open the portal.'
          : 'This invitation does not include a shared password. Choose one for this staff account.'}
      </p>
      <form onSubmit={submit}>
        <PasswordField
          id="staff-new-password"
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
          required
          disabled={busy}
        />
        <PasswordField
          id="staff-confirm-password"
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          minLength={8}
          required
          disabled={busy}
          describedBy={mismatchVisible ? confirmMessageId : undefined}
        />
        {mismatchVisible ? <p id={confirmMessageId} role="alert">Passwords do not match.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </div>
      </form>
    </>
  )
}
