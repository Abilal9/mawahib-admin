import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { SignOutButton } from './SignOutButton'

afterEach(() => {
  cleanup()
})

function deferred() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('SignOutButton', () => {
  it('asks before signing out and leaves the session unchanged on cancel or escape', () => {
    const calls: string[] = []
    render(
      <section>
        <h1>Staff session</h1>
        <SignOutButton
          onSignOut={() => {
            calls.push('out')
          }}
        />
      </section>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    const dialog = screen.getByRole('dialog', { name: 'Sign out?' })
    expect(within(dialog).getByText('Are you sure you want to sign out of Mawahib Admin?')).toBeTruthy()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(calls).toEqual([])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Staff session' })).toBeTruthy()
    expect(calls).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Sign out?' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(calls).toEqual([])
  })

  it('runs sign-out once after confirmation and ignores a repeated confirmation', async () => {
    const pending = deferred()
    const calls: string[] = []
    render(
      <SignOutButton
        onSignOut={() => {
          calls.push('out')
          return pending.promise
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    const confirm = within(screen.getByRole('dialog', { name: 'Sign out?' })).getByRole('button', { name: 'Sign out' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(calls).toEqual(['out'])
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(calls).toEqual(['out'])
  })

  it('closes after confirmation under Strict Mode', async () => {
    const pending = deferred()
    render(
      <StrictMode>
        <SignOutButton onSignOut={() => pending.promise} />
      </StrictMode>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Sign out?' })).getByRole('button', { name: 'Sign out' }))
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
