import { describe, expect, it, vi } from 'vitest'
import { createSessionAuthStorage } from './sessionStorage'

describe('createSessionAuthStorage', () => {
  it('delegates to the tab session store without adding an access flag', () => {
    const storage = {
      getItem: vi.fn(() => 'saved-session'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    const authStorage = createSessionAuthStorage(storage)
    authStorage.setItem('sb-project-auth-token', 'saved-session')
    expect(authStorage.getItem('sb-project-auth-token')).toBe('saved-session')
    authStorage.removeItem('sb-project-auth-token')
    expect(storage.setItem).toHaveBeenCalledWith('sb-project-auth-token', 'saved-session')
    expect(storage.removeItem).toHaveBeenCalledWith('sb-project-auth-token')
    expect(storage.setItem).not.toHaveBeenCalledWith('authorized-staff', expect.anything())
  })
})
