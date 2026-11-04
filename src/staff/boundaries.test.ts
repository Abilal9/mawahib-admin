import { describe, expect, it } from 'vitest'

const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('portal boundaries', () => {
  it('does not call product bootstrap or read server credentials', () => {
    const production = Object.entries(sourceFiles).filter(([path]) => !path.includes('.test.'))
    const paths = production.map(([path]) => path)
    expect(paths.some((path) => path.endsWith('supabaseAuth.ts'))).toBe(true)
    expect(paths.some((path) => path.endsWith('staffAccess.ts'))).toBe(true)
    const source = production.map(([, text]) => text).join('\n')
    expect(source).not.toContain('/auth/bootstrap')
    expect(source).not.toContain('localStorage')
    expect(source).not.toContain('service_role')
    expect(source).not.toContain('DATABASE_URL')
    expect(source).not.toContain('dangerouslySetInnerHTML')
    expect(source).toContain('detectSessionInUrl: false')
  })
})
