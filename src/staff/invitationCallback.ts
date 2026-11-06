const secretNames = new Set([
  'access_token',
  'refresh_token',
  'token_hash',
  'token',
  'code',
  'error_description',
])

export type InviteCallback =
  | { kind: 'absent' }
  | { kind: 'wrong-flow' }
  | { kind: 'incomplete' }
  | { kind: 'otp'; tokenHash: string }
  | { kind: 'recovery'; tokenHash: string }
  | { kind: 'unverified-session' }

export function readInviteCallback(search: string, hash: string): InviteCallback {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const type = query.get('type') || fragment.get('type')
  if (!type && !query.get('token_hash') && !fragment.get('access_token')) return { kind: 'absent' }
  const tokenHash = query.get('token_hash')
  if (type === 'recovery' && tokenHash) return { kind: 'recovery', tokenHash }
  if (type === 'invite' && tokenHash) return { kind: 'otp', tokenHash }
  if (fragment.get('access_token') || fragment.get('refresh_token')) return { kind: 'unverified-session' }
  if (type === 'recovery' || type === 'invite') return { kind: 'incomplete' }
  return { kind: 'wrong-flow' }
}

export function inviteLocationWithoutSecrets(search: string, hash: string): { search: string; hash: string } {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  for (const name of secretNames) {
    query.delete(name)
    fragment.delete(name)
  }
  if (query.get('type') === 'invite' || query.get('type') === 'recovery') query.delete('type')
  if (fragment.get('type') === 'invite' || fragment.get('type') === 'recovery') fragment.delete('type')
  const nextSearch = query.toString()
  const nextHash = fragment.toString()
  return { search: nextSearch ? `?${nextSearch}` : '', hash: nextHash ? `#${nextHash}` : '' }
}

export function stripInviteLocation(location: Pick<Location, 'pathname' | 'search' | 'hash'>, replace: (url: string) => void) {
  const next = inviteLocationWithoutSecrets(location.search, location.hash)
  replace(`${location.pathname}${next.search}${next.hash}`)
}
