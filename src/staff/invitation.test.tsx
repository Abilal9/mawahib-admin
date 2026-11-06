import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beginInvitation, passwordProblem } from './invitationFlow'
import { inviteLocationWithoutSecrets, readInviteCallback, stripInviteLocation } from './invitationCallback'
import { InvitationScreen } from './InvitationScreen'

describe('staff invitation callback', () => {
  it('reads an invite token hash and removes it from the address', () => {
    const callback = readInviteCallback('?type=invite&token_hash=secret-hash&stay=1', '')
    expect(callback).toEqual({ kind: 'otp', tokenHash: 'secret-hash' })
    const next = inviteLocationWithoutSecrets('?type=invite&token_hash=secret-hash&stay=1', '#access_token=secret-access')
    expect(next.search).toBe('?stay=1')
    expect(next.hash).toBe('')
    expect(JSON.stringify(next)).not.toContain('secret')
    const replace = vi.fn()
    stripInviteLocation({ pathname: '/invite', search: '?token_hash=secret-hash&type=invite', hash: '' }, replace)
    expect(replace).toHaveBeenCalledWith('/invite')
    expect(JSON.stringify(replace.mock.calls)).not.toContain('secret-hash')
  })

  it('rejects another email flow without keeping its token', () => {
    expect(readInviteCallback('?type=recovery&token_hash=secret-hash', '')).toEqual({
      kind: 'recovery',
      tokenHash: 'secret-hash',
    })
    expect(readInviteCallback('', '#access_token=secret-access&refresh_token=secret-refresh&type=recovery')).toEqual({
      kind: 'unverified-session',
    })
    expect(readInviteCallback('', '#access_token=secret-access&refresh_token=secret-refresh&type=invite')).toEqual({
      kind: 'unverified-session',
    })
    expect(JSON.stringify(readInviteCallback('', '#access_token=secret-access&refresh_token=secret-refresh&type=invite'))).not.toContain('secret')
  })

  it('does not attach an invitation to a signed-in staff account', async () => {
    const acceptOtp = vi.fn(async () => 'ok' as const)
    const view = await beginInvitation({
      callback: { kind: 'otp', tokenHash: 'secret-hash' },
      currentUserId: 'already-signed-in',
      savedStep: null,
      savedSubjectId: null,
      acceptOtp,
      acceptRecovery: async () => 'ok',
    })
    expect(view).toEqual({ name: 'conflict' })
    expect(acceptOtp).not.toHaveBeenCalled()
  })

  it('verifies password recovery separately from an invitation', async () => {
    const acceptOtp = vi.fn(async () => 'ok' as const)
    const acceptRecovery = vi.fn(async () => 'ok' as const)
    expect(
      await beginInvitation({
        callback: { kind: 'recovery', tokenHash: 'secret-hash' },
        currentUserId: null,
        savedStep: null,
        savedSubjectId: null,
        acceptOtp,
        acceptRecovery,
      }),
    ).toEqual({ name: 'password', purpose: 'recovery', error: null, busy: false })
    expect(acceptOtp).not.toHaveBeenCalled()
    expect(acceptRecovery).toHaveBeenCalledWith('secret-hash')
  })

  it('maps an expired, invalid, or unavailable provider result and resumes after reload', async () => {
    expect(
      await beginInvitation({
        callback: { kind: 'otp', tokenHash: 'secret-hash' },
        currentUserId: null,
        savedStep: null,
        savedSubjectId: null,
        acceptOtp: async () => 'expired',
        acceptRecovery: async () => 'ok',
      }),
    ).toEqual({ name: 'expired' })
    const acceptOtp = vi.fn(async () => 'ok' as const)
    expect(
      await beginInvitation({
        callback: { kind: 'unverified-session' },
        currentUserId: null,
        savedStep: null,
        savedSubjectId: null,
        acceptOtp,
        acceptRecovery: async () => 'ok',
      }),
    ).toEqual({ name: 'unverified-link' })
    expect(acceptOtp).not.toHaveBeenCalled()
    expect(
      await beginInvitation({
        callback: { kind: 'absent' },
        currentUserId: '33333333-3333-4333-8333-333333333333',
        savedStep: 'password',
        savedSubjectId: '33333333-3333-4333-8333-333333333333',
        acceptOtp: async () => 'ok',
        acceptRecovery: async () => 'ok',
      }),
    ).toEqual({ name: 'password', purpose: 'invite', error: null, busy: false })
    expect(
      await beginInvitation({
        callback: { kind: 'absent' },
        currentUserId: null,
        savedStep: 'password',
        savedSubjectId: '33333333-3333-4333-8333-333333333333',
        acceptOtp: async () => 'ok',
        acceptRecovery: async () => 'ok',
      }),
    ).toEqual({ name: 'interrupted' })
    expect(
      await beginInvitation({
        callback: { kind: 'absent' },
        currentUserId: '44444444-4444-4444-8444-444444444444',
        savedStep: 'accepting',
        savedSubjectId: null,
        acceptOtp: async () => 'ok',
        acceptRecovery: async () => 'ok',
      }),
    ).toEqual({ name: 'conflict' })
    expect(passwordProblem('short')).toMatch(/8/)
    expect(passwordProblem('long-enough')).toBeNull()
  })

  it('shows password, failure, and waiting screens without a provider', async () => {
    const onPassword = vi.fn()
    const { rerender } = render(<InvitationScreen state={{ name: 'password', purpose: 'invite', error: null, busy: false }} onPassword={onPassword} />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'chosen-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(onPassword).toHaveBeenCalledWith('chosen-password')
    rerender(<InvitationScreen state={{ name: 'failure' }} onRetry={() => undefined} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Nothing was changed/)
    rerender(<InvitationScreen state={{ name: 'waiting' }} onSignOut={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Waiting for activation' })).toBeTruthy()
  })
})
