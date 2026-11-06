import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

type SignOutButtonProps = {
  onSignOut: () => void | Promise<void>
  className?: string
  children?: string
}

export function SignOutButton({ onSignOut, className, children = 'Sign out' }: SignOutButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const openerRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function close() {
    if (busyRef.current) return
    setOpen(false)
    openerRef.current?.focus()
  }

  async function confirm() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await onSignOut()
    } finally {
      busyRef.current = false
      if (!mountedRef.current) return
      setBusy(false)
      setOpen(false)
      openerRef.current?.focus()
    }
  }

  return (
    <>
      <button ref={openerRef} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? createPortal(<SignOutDialog busy={busy} onCancel={close} onConfirm={() => void confirm()} />, document.body) : null}
    </>
  )
}

function SignOutDialog({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const first = cancelRef.current
    const last = confirmRef.current
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="sign-out-layer" onKeyDown={onKeyDown}>
      <div
        className="sign-out-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-out-title"
        aria-describedby="sign-out-message"
      >
        <h2 id="sign-out-title">Sign out?</h2>
        <p id="sign-out-message">Are you sure you want to sign out of Mawahib Admin?</p>
        <div className="actions">
          <button ref={cancelRef} type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} disabled={busy}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
