export function LoadingIndicator({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={compact ? 'loading-inline' : 'loading-block'} role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <span className="loading-spinner" aria-hidden="true" />
    </div>
  )
}

export function ButtonSpinner() {
  return <span className="loading-spinner loading-spinner-small" aria-hidden="true" />
}
