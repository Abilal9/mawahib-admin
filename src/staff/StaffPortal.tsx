import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { PasswordField } from './PasswordField'
import { SignOutButton } from './SignOutButton'
import { AdminShell } from './AdminShell'
import { ButtonSpinner } from './LoadingIndicator'
import type { AdminRecords, AdminRoute } from './adminTypes'
import type { StaffAccessClient, StaffAuthClient } from './types'
import { useStaffSession } from './useStaffSession'

type StaffPortalProps = {
  auth: StaffAuthClient
  access: StaffAccessClient
  records?: AdminRecords
  initialRoute?: AdminRoute
  initialNotice?: string | null
  startConfirming?: boolean
  onEnterDemo?: () => void
}

export function StaffPortal({ auth, access, records, initialRoute, initialNotice, startConfirming, onEnterDemo }: StaffPortalProps) {
  const session = useStaffSession(auth, access)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [recordsDenied, setRecordsDenied] = useState(false)
  const denyRecords = useCallback(() => setRecordsDenied(true), [])
  const phase = session.state.name
  const wide = phase === 'accepted' && records && !recordsDenied

  useEffect(() => {
    setRecordsDenied(false)
  }, [phase])

  useEffect(() => {
    headingRef.current?.focus()
  }, [phase])

  if (phase === 'accepted' && records && !recordsDenied) {
    return (
      <AdminShell
        records={records}
        initialRoute={initialRoute}
        onSignOut={() => session.signOut()}
        onAccessDenied={denyRecords}
        initialNotice={initialNotice}
        startConfirming={startConfirming}
      />
    )
  }

  return (
    <main className="shell">
      <section className={wide ? 'card wide' : 'card'} aria-labelledby="portal-title">
        <p className="brand">Mawahib</p>
        {session.notice ? <p role="alert">{session.notice}</p> : null}
        <PortalBody
          session={session}
          headingRef={headingRef}
          records={records}
          initialRoute={initialRoute}
          recordsDenied={recordsDenied}
          onAccessDenied={denyRecords}
          initialNotice={initialNotice}
          startConfirming={startConfirming}
          onEnterDemo={onEnterDemo}
        />
      </section>
    </main>
  )
}

type SessionController = ReturnType<typeof useStaffSession>

function PortalBody({
  session,
  headingRef,
  records,
  initialRoute,
  recordsDenied,
  onAccessDenied,
  initialNotice,
  startConfirming,
  onEnterDemo,
}: {
  session: SessionController
  headingRef: RefObject<HTMLHeadingElement | null>
  records?: AdminRecords
  initialRoute?: AdminRoute
  recordsDenied?: boolean
  onAccessDenied?: () => void
  initialNotice?: string | null
  startConfirming?: boolean
  onEnterDemo?: () => void
}) {
  const { state } = session

  if (state.name === 'initializing' || state.name === 'checking') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          {state.name === 'initializing' ? 'Checking your session' : 'Checking staff access'}
        </h1>
        <p>Wait a moment.</p>
      </>
    )
  }

  if (state.name === 'signed-out') {
    return <SignIn state={state} onSubmit={session.signIn} headingRef={headingRef} onEnterDemo={onEnterDemo} />
  }

  if (state.name === 'setup-required') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Authenticator setup required
        </h1>
        <p>Add this account to an authenticator app. Verification does not activate staff access. An administrator still has to activate this account.</p>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <div className="actions">
          <button type="button" onClick={() => void session.beginEnrollment()} disabled={state.busy} aria-busy={state.busy}>
            {state.busy ? <ButtonSpinner /> : null}
            Set up authenticator
          </button>
          <SignOutButton className="secondary" onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'enrollment-interrupted') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Authenticator setup was interrupted
        </h1>
        <p>The previous setup was not finished. Start again to get a new code. This does not activate staff access.</p>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <div className="actions">
          <button type="button" onClick={() => void session.restartEnrollment()} disabled={state.busy} aria-busy={state.busy}>
            {state.busy ? <ButtonSpinner /> : null}
            Set up authenticator again
          </button>
          <SignOutButton className="secondary" onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'enrolling') {
    return (
      <CodeForm
        heading="Authenticator setup"
        headingRef={headingRef}
        instructions="Enter this setup secret in your authenticator app, then enter the current 6-digit code. Verification does not activate staff access."
        secret={state.secret}
        qrCode={state.qrCode}
        error={state.error}
        busy={state.busy}
        submitLabel="Verify code"
        onSubmit={(code) => void session.verifyCode(code)}
        onCancel={session.cancelEnrollment}
        onSignOut={() => session.signOut()}
      />
    )
  }

  if (state.name === 'challenge') {
    return (
      <CodeForm
        heading="Authenticator code"
        headingRef={headingRef}
        instructions="Enter the current code from your authenticator app."
        error={state.error}
        busy={state.busy || state.challengeId === null}
        submitLabel="Verify code"
        onSubmit={(code) => void session.verifyCode(code)}
        onRetry={state.challengeId === null ? () => void session.retryChallenge() : undefined}
        onSignOut={() => session.signOut()}
      />
    )
  }

  if (state.name === 'accepted' && recordsDenied) {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Staff access unavailable
        </h1>
        <p role="alert">Staff access is not active for this account. Contact your administrator.</p>
        <div className="actions">
          <SignOutButton onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'accepted') {
    if (records) {
      return (
        <AdminShell
          records={records}
          initialRoute={initialRoute}
          onSignOut={() => session.signOut()}
          onAccessDenied={onAccessDenied}
          initialNotice={initialNotice}
          startConfirming={startConfirming}
        />
      )
    }
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Staff session
        </h1>
        <p>Role: Operator</p>
        <div className="actions">
          <SignOutButton onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'pending') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Waiting for activation
        </h1>
        <p>Your password and authenticator are saved. An administrator still has to activate this staff account before it can open the portal.</p>
        <div className="actions">
          <SignOutButton onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'denied') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Staff access unavailable
        </h1>
        <p role="alert">Staff access is not active for this account. Contact your administrator.</p>
        <div className="actions">
          <SignOutButton onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'auth-unavailable') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Authenticator service unavailable
        </h1>
        <p role="alert">The authenticator service is temporarily unavailable. Try again.</p>
        <div className="actions">
          <button type="button" onClick={() => void session.retryAuthentication()}>
            Try again
          </button>
          <SignOutButton className="secondary" onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  if (state.name === 'unavailable') {
    return (
      <>
        <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
          Staff service unavailable
        </h1>
        <p role="alert">The staff service is temporarily unavailable. Try again.</p>
        <div className="actions">
          <button type="button" onClick={() => void session.retryStaffCheck()}>
            Try again
          </button>
          <SignOutButton className="secondary" onSignOut={() => session.signOut()} />
        </div>
      </>
    )
  }

  return (
    <>
      <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
        Administrator help required
      </h1>
      <p role="alert">This account’s authenticator setup needs an administrator. Contact your administrator.</p>
      <div className="actions">
        <SignOutButton onSignOut={() => session.signOut()} />
      </div>
    </>
  )
}

function SignIn({
  state,
  onSubmit,
  headingRef,
  onEnterDemo,
}: {
  state: { error: string | null; busy: boolean }
  onSubmit: (email: string, password: string) => Promise<void>
  headingRef: RefObject<HTMLHeadingElement | null>
  onEnterDemo?: () => void
}) {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void onSubmit(email, password)
  }

  return (
    <>
      <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
        Staff sign in
      </h1>
      <p>Use your staff email and password.</p>
      <form onSubmit={submit}>
        <label htmlFor={emailId}>Email</label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          value={email}
          disabled={state.busy}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          id={passwordId}
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
          disabled={state.busy}
        />
        {state.error ? <p role="alert">{state.error}</p> : null}
        <div className="actions">
          <button type="submit" disabled={state.busy} aria-busy={state.busy}>
            {state.busy ? <ButtonSpinner /> : null}
            Sign in
          </button>
          {import.meta.env.DEV && onEnterDemo ? (
            <button type="button" className="secondary" onClick={onEnterDemo}>
              Enter demo
            </button>
          ) : null}
        </div>
      </form>
    </>
  )
}

function CodeForm({
  heading,
  headingRef,
  instructions,
  secret,
  qrCode,
  error,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  onRetry,
  onSignOut,
}: {
  heading: string
  headingRef: RefObject<HTMLHeadingElement | null>
  instructions: string
  secret?: string
  qrCode?: string | null
  error: string | null
  busy: boolean
  submitLabel: string
  onSubmit: (code: string) => void
  onCancel?: () => void
  onRetry?: () => void
  onSignOut: () => void
}) {
  const secretId = useId()
  const codeId = useId()
  const [code, setCode] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(code)
  }

  return (
    <>
      <h1 id="portal-title" ref={headingRef} tabIndex={-1}>
        {heading}
      </h1>
      <p>{instructions}</p>
      <form onSubmit={submit}>
        {qrCode ? <img className="setup-qr" alt="Authenticator setup QR code" src={qrCode} /> : null}
        {secret ? (
          <>
            <label htmlFor={secretId}>Setup secret</label>
            <input id={secretId} readOnly value={secret} spellCheck={false} autoComplete="off" />
          </>
        ) : null}
        <label htmlFor={codeId}>6-digit code</label>
        <input
          id={codeId}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          value={code}
          disabled={busy}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {error ? <p role="alert">{error}</p> : null}
        <div className="actions">
          <button type="submit" disabled={busy || code.length !== 6} aria-busy={busy}>
            {busy ? <ButtonSpinner /> : null}
            {submitLabel}
          </button>
          {onRetry ? (
            <button type="button" className="secondary" onClick={onRetry}>
              Try again
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
              Cancel setup
            </button>
          ) : null}
          <SignOutButton className="secondary" onSignOut={onSignOut} />
        </div>
      </form>
    </>
  )
}
