import type { AdminResult } from './adminTypes'

export type ContentModerationChange = {
  outcome: 'changed' | 'unchanged'
  hidden: boolean
  hiddenAt: string | null
  version: number
}

export function moderationNotice(result: AdminResult<ContentModerationChange>): string | null {
  if (!result.ok) {
    if (result.kind === 'conflict') {
      return 'This content changed. The state below is current. Confirm it again if you still want to change it.'
    }
    if (result.kind === 'uncertain' || result.kind === 'unavailable') {
      return 'The result was not confirmed. The state below is the current one, and this request is not assumed to have caused it.'
    }
    return 'That visibility change was not saved.'
  }
  if (result.data.outcome === 'unchanged') {
    return 'The content was already in that state. This request did not change it.'
  }
  return null
}

export function shouldRefreshModeration(result: AdminResult<ContentModerationChange>): boolean {
  if (result.ok) return true
  return result.kind === 'conflict' || result.kind === 'uncertain' || result.kind === 'unavailable'
}
