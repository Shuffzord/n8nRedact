import { describe, it, expect } from 'vitest'
import { fakeEmail, fakeUrl, fakeUuid, fakeToken, fakeHex } from '../../src/lib/engine/generators'

describe('generators', () => {
  it('fakeEmail uses the reserved example.com domain', () => {
    expect(fakeEmail(3)).toBe('user3@example.com')
  })

  it('fakeUrl keeps scheme + path and drops host/auth/query', () => {
    expect(fakeUrl('https://api.acme.com/v1/users?token=abc', 1)).toBe(
      'https://example1.com/v1/users',
    )
    expect(fakeUrl('not a url', 2)).toBe('https://example2.com')
  })

  it('fakeUuid returns a syntactically valid v4-shaped UUID', () => {
    expect(fakeUuid(42)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('fakeToken preserves length and character classes', () => {
    const out = fakeToken('sk_live_ABC123def', 1)
    expect(out).toHaveLength('sk_live_ABC123def'.length)
    expect(out.slice(0, 3)).toMatch(/^[a-z]{2}_$/) // "sk_" shape kept
    expect(out).toContain('_') // separators preserved in place
    expect(out).not.toContain('sk_live_ABC') // content not preserved
  })

  it('fakeHex produces lowercase hex of the requested length', () => {
    expect(fakeHex(1, 32)).toMatch(/^[0-9a-f]{32}$/)
    expect(fakeHex(1, 64)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generators are pure — same args give same result', () => {
    expect(fakeToken('AAA-111', 7)).toBe(fakeToken('AAA-111', 7))
    expect(fakeHex(3, 32)).toBe(fakeHex(3, 32))
  })
})
