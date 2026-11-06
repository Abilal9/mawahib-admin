import type { SupabaseClient } from '@supabase/supabase-js'
import { passwordProblem } from './invitationFlow'

export type InviteAcceptance = {
  currentUserId(): Promise<string | null | 'unavailable'>
  acceptOtp(tokenHash: string): Promise<'ok' | 'invalid' | 'expired' | 'unavailable'>
  acceptRecovery(tokenHash: string): Promise<'ok' | 'invalid' | 'expired' | 'unavailable'>
  choosePassword(password: string): Promise<string | null>
  signOut(): Promise<void>
}

export function createInviteAcceptance(client: SupabaseClient): InviteAcceptance {
  return {
    async currentUserId() {
      const { data, error } = await client.auth.getSession()
      if (error) return 'unavailable'
      return data.session?.user?.id ?? null
    },
    async acceptOtp(tokenHash) {
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' })
      return classify(error)
    },
    async acceptRecovery(tokenHash) {
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      return classify(error)
    },
    async choosePassword(password) {
      const local = passwordProblem(password)
      if (local) return local
      const { error } = await client.auth.updateUser({ password })
      if (!error) return null
      if (error.status && error.status >= 500) return 'The password service is temporarily unavailable. Try again.'
      return 'Choose a different password. The staff sign-in service did not accept this one.'
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw new Error('sign-out-failed')
    },
  }
}

function classify(error: { message: string; status?: number } | null): 'ok' | 'invalid' | 'expired' | 'unavailable' {
  if (!error) return 'ok'
  if (error.status && error.status >= 500) return 'unavailable'
  if (error.message.toLowerCase().includes('expired')) return 'expired'
  return 'invalid'
}
