import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules } from '../../src/lib/engine'
import { phoneRule } from '../../src/lib/engine/rules'

const PHONE_SHAPE =
  /(?:\+\d{7,15}|\+\d{1,3}(?:[ ]\d{2,4}){2,5}|\(\d{3}\)[ ]?\d{3}[ -]\d{4}|\d{3}[ -]\d{3}[ -]\d{4})/

// The negatives run against the phone rule in isolation, so a match can only be
// the phone rule (not chatId/uuid/hexId, which also fire under defaultRules()).
const phoneOnly = (value: string): string =>
  (anonymize({ v: value }, [phoneRule()]).output as { v: string }).v

describe('phone rule', () => {
  it('replaces an E.164 number, leaving no trace of the original', () => {
    const { output, changes } = anonymize({ phone: '+14155552671' }, defaultRules())
    const out = output as { phone: string }
    expect(out.phone).not.toBe('+14155552671')
    expect(out.phone).toMatch(PHONE_SHAPE) // still phone-shaped
    expect(out.phone).toContain('555') // NANP fictional range
    expect(changes.some((c) => c.category === 'phone')).toBe(true)
  })

  it('replaces a formatted number while preserving its shape', () => {
    const out = (anonymize({ phone: '(415) 555-2671' }, defaultRules()).output as { phone: string })
      .phone
    expect(out).not.toBe('(415) 555-2671')
    expect(out).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/) // separators/grouping preserved
    expect(out).toContain('555')
  })

  it('is deterministic — same input yields the same fake', () => {
    const a = anonymize({ phone: '+14155552671' }, defaultRules()).output as { phone: string }
    const b = anonymize({ phone: '+14155552671' }, defaultRules()).output as { phone: string }
    expect(a.phone).toBe(b.phone)
  })

  it('referential integrity — the same number twice maps to one fake', () => {
    const out = anonymize({ a: '123-456-7890', b: '123-456-7890' }, defaultRules()).output as {
      a: string
      b: string
    }
    expect(out.a).toBe(out.b)
    expect(out.a).not.toBe('123-456-7890')
  })

  it('does NOT match bare digit runs (13-digit id)', () => {
    expect(phoneOnly('1002405526505')).toBe('1002405526505')
  })

  it('does NOT match a bare timestamp-style number', () => {
    expect(phoneOnly('20250107')).toBe('20250107')
  })

  it('does NOT match a dashed UUID', () => {
    const uuid = 'b1e7c8d2-1234-4abc-8def-0123456789ab'
    expect(phoneOnly(uuid)).toBe(uuid)
  })

  it('skips n8n expression references', () => {
    const expr = '={{ $json.phone }}+14155552671'
    expect(phoneOnly(expr)).toBe(expr)
  })
})
